package ua.healthpro.app;

import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ForegroundStepPlugin.class);
        super.onCreate(savedInstanceState);

        // Keep app content below system bars (status/navigation), disable fullscreen overlay.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
