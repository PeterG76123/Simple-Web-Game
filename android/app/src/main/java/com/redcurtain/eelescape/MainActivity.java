package com.redcurtain.eelescape;

import android.os.Bundle;
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
  }
}
