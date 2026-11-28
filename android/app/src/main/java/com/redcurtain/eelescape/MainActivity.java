package com.redcurtain.eelescape;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // The game lays out its own text to fit its boards and buttons: don't let
    // Android's font-size setting scale it up (it overflows the level bubbles
    // and menu cards on phones with large text).
    WebSettings settings = this.bridge.getWebView().getSettings();
    settings.setTextZoom(100);
    preferSixtyHertz();
  }

  /**
   * Asks for the screen's 60 Hz mode: a calm puzzle game doesn't need 90 or 120
   * frames a second, and on phones that run that fast it saves battery and heat.
   */
  @SuppressWarnings("deprecation")
  private void preferSixtyHertz() {
    try {
      Display display = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? getDisplay() : getWindowManager().getDefaultDisplay();
      if (display == null) return;
      WindowManager.LayoutParams params = getWindow().getAttributes();
      Display.Mode current = display.getMode();
      for (Display.Mode mode : display.getSupportedModes()) {
        float rate = mode.getRefreshRate();
        if (rate > 59f && rate < 61f
            && mode.getPhysicalWidth() == current.getPhysicalWidth()
            && mode.getPhysicalHeight() == current.getPhysicalHeight()) {
          params.preferredDisplayModeId = mode.getModeId();
          break;
        }
      }
      params.preferredRefreshRate = 60f;
      getWindow().setAttributes(params);
    } catch (RuntimeException e) {
      // Not offered on this phone: it keeps its usual rate.
    }
  }
}
