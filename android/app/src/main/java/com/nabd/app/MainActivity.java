package com.nabd.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugin: pops the in-app "turn on location" dialog when GPS is off (NBD-63).
        registerPlugin(LocationEnablerPlugin.class);
        // App-local plugin: alarm-usage channels so the adhan plays on silent (NBD-64).
        registerPlugin(AlarmAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
