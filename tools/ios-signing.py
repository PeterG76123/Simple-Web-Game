#!/usr/bin/env python3
"""
App Store signing for the iPhone build on GitHub (no Mac, no registered iPhone needed).

  ios-signing.py setup  <workdir>   makes a distribution certificate and an App Store
                                    profile through the App Store Connect API, installs
                                    them (keychain + profile) and patches the App target
                                    to sign manually with them; writes <workdir>/export.plist
  ios-signing.py cleanup <workdir>  revokes that certificate and deletes the profile

Uploaded builds stay valid after cleanup (Apple re-signs TestFlight/App Store builds).
Needs env: TEAM_ID, ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY (the .p8 text). pip: pyjwt cryptography
"""
import base64, json, os, re, subprocess, sys, time, urllib.request, urllib.error, uuid
import jwt

BUNDLE = 'com.redcurtain.eelescape'
PBXPROJ = 'ios/App/App.xcodeproj/project.pbxproj'
API = 'https://api.appstoreconnect.apple.com/v1'


def token():
    now = int(time.time())
    return jwt.encode({'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 1100, 'aud': 'appstoreconnect-v1'},
                      os.environ['ASC_KEY'], algorithm='ES256', headers={'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'})


def api(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            data = r.read()
            return json.loads(data) if data else {}
    except urllib.error.HTTPError as e:
        sys.exit(f'App Store Connect API {method} {path} failed: {e.code} {e.read().decode()[:800]}')


def run(*cmd, **kw):
    subprocess.run(cmd, check=True, **kw)


def setup(work):
    os.makedirs(work, exist_ok=True)
    key, csr = f'{work}/dist.key', f'{work}/dist.csr'
    run('openssl', 'req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', csr, '-subj', '/CN=Eel Escape CI/O=RedCurtain')
    csr_text = open(csr).read()
    cert = api('POST', '/certificates', {'data': {'type': 'certificates', 'attributes': {'certificateType': 'DISTRIBUTION', 'csrContent': csr_text}}})['data']
    open(f'{work}/cert_id', 'w').write(cert['id'])
    open(f'{work}/dist.cer', 'wb').write(base64.b64decode(cert['attributes']['certificateContent']))
    bundle = api('GET', f'/bundleIds?filter[identifier]={BUNDLE}&limit=20')['data']
    bundle = [b for b in bundle if b['attributes']['identifier'] == BUNDLE][0]
    name = f'Eel Escape CI {int(time.time())}'
    prof = api('POST', '/profiles', {'data': {'type': 'profiles', 'attributes': {'name': name, 'profileType': 'IOS_APP_STORE'},
        'relationships': {'bundleId': {'data': {'type': 'bundleIds', 'id': bundle['id']}},
                          'certificates': {'data': [{'type': 'certificates', 'id': cert['id']}]}}}})['data']
    open(f'{work}/profile_id', 'w').write(prof['id'])
    content = base64.b64decode(prof['attributes']['profileContent'])
    pdir = os.path.expanduser('~/Library/MobileDevice/Provisioning Profiles')
    os.makedirs(pdir, exist_ok=True)
    puuid = prof['attributes']['uuid']
    open(f'{pdir}/{puuid}.mobileprovision', 'wb').write(content)
    # Keychain with the certificate and its key.
    pw = uuid.uuid4().hex
    run('openssl', 'x509', '-inform', 'DER', '-in', f'{work}/dist.cer', '-out', f'{work}/dist.pem')
    run('openssl', 'pkcs12', '-export', '-legacy', '-inkey', key, '-in', f'{work}/dist.pem', '-out', f'{work}/dist.p12', '-passout', f'pass:{pw}')
    kc = f'{work}/signing.keychain-db'
    run('security', 'create-keychain', '-p', pw, kc)
    run('security', 'set-keychain-settings', '-lut', '21600', kc)
    run('security', 'unlock-keychain', '-p', pw, kc)
    run('security', 'import', f'{work}/dist.p12', '-k', kc, '-P', pw, '-T', '/usr/bin/codesign', '-T', '/usr/bin/security')
    run('security', 'set-key-partition-list', '-S', 'apple-tool:,apple:,codesign:', '-s', '-k', pw, kc, stdout=subprocess.DEVNULL)
    existing = subprocess.run(['security', 'list-keychains', '-d', 'user'], capture_output=True, text=True).stdout.split()
    run('security', 'list-keychains', '-d', 'user', '-s', kc, *[k.strip('"') for k in existing])
    # The App target (only it: the packages' targets mustn't get a profile) signs manually.
    team = os.environ['TEAM_ID']
    s = open(PBXPROJ).read()
    def patch(m):
        block = m.group(0)
        if f'PRODUCT_BUNDLE_IDENTIFIER = {BUNDLE};' not in block:
            return block
        block = re.sub(r'\n\s*(CODE_SIGN_STYLE|CODE_SIGN_IDENTITY|DEVELOPMENT_TEAM|PROVISIONING_PROFILE_SPECIFIER|"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]") = [^;]*;', '', block)
        return block.replace('buildSettings = {', 'buildSettings = {\n\t\t\t\tCODE_SIGN_STYLE = Manual;\n\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";\n'
                             f'\t\t\t\tDEVELOPMENT_TEAM = {team};\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "{name}";', 1)
    s2 = re.sub(r'buildSettings = \{.*?\n\t\t\t\};', patch, s, flags=re.S)
    assert s2 != s, 'App target build settings not found'
    open(PBXPROJ, 'w').write(s2)
    open(f'{work}/export.plist', 'w').write(f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>{team}</string>
  <key>signingStyle</key><string>manual</string>
  <key>signingCertificate</key><string>Apple Distribution</string>
  <key>provisioningProfiles</key><dict><key>{BUNDLE}</key><string>{name}</string></dict>
</dict></plist>
''')
    print(f'Signing ready: certificate {cert["id"]}, profile "{name}"')


def cleanup(work):
    for kind, f in (('profiles', 'profile_id'), ('certificates', 'cert_id')):
        p = f'{work}/{f}'
        if os.path.exists(p):
            i = open(p).read().strip()
            req = urllib.request.Request(f'{API}/{kind}/{i}', method='DELETE', headers={'Authorization': 'Bearer ' + token()})
            try:
                urllib.request.urlopen(req)
                print(f'Deleted {kind[:-1]} {i}')
            except urllib.error.HTTPError as e:
                print(f'Could not delete {kind[:-1]} {i}: {e.code}')


if __name__ == '__main__':
    {'setup': setup, 'cleanup': cleanup}[sys.argv[1]](sys.argv[2])
