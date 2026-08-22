package com.yoonho.habitus.ui;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.content.res.Resources;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class UiKit {
    public static final int GREEN = Color.rgb(31, 93, 79);
    public static final int GREEN_LIGHT = Color.rgb(226, 239, 233);
    public static final int CREAM = Color.rgb(247, 245, 238);
    public static final int INK = Color.rgb(34, 42, 39);
    public static final int MUTED = Color.rgb(105, 116, 111);
    public static final int LINE = Color.rgb(230, 232, 228);
    public static final int WHITE = Color.WHITE;

    private UiKit() { }

    public static int dp(Context context, float value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    public static TextView text(Context context, String value, float sizeSp, int color) {
        TextView view = new TextView(context);
        view.setText(value);
        view.setTextSize(sizeSp);
        view.setTextColor(color);
        view.setIncludeFontPadding(false);
        view.setLineSpacing(0, 1.08f);
        return view;
    }

    public static TextView title(Context context, String value, float sizeSp) {
        TextView view = text(context, value, sizeSp, INK);
        view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    public static TextView button(Context context, String value, boolean filled) {
        TextView view = title(context, value, 14);
        view.setTextColor(filled ? WHITE : GREEN);
        view.setGravity(Gravity.CENTER);
        view.setPadding(dp(context, 16), dp(context, 11), dp(context, 16), dp(context, 11));
        view.setBackground(roundRect(filled ? GREEN : GREEN_LIGHT, 14));
        view.setClickable(true);
        view.setFocusable(true);
        return view;
    }

    public static LinearLayout card(Context context) {
        LinearLayout layout = new LinearLayout(context);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dp(context, 18), dp(context, 18), dp(context, 18), dp(context, 18));
        layout.setBackground(roundRect(WHITE, 22));
        layout.setElevation(dp(context, 1));
        return layout;
    }

    public static GradientDrawable roundRect(int color, float radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radiusDp * Resources.getSystem().getDisplayMetrics().density);
        return drawable;
    }

    public static GradientDrawable outlined(int fill, int stroke, float radiusDp, int strokeWidthPx) {
        GradientDrawable drawable = roundRect(fill, radiusDp);
        drawable.setStroke(strokeWidthPx, stroke);
        return drawable;
    }

    public static LinearLayout.LayoutParams margins(Context context, int width, int height,
                                                     int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(width, height);
        params.setMargins(dp(context, left), dp(context, top), dp(context, right), dp(context, bottom));
        return params;
    }

    public static void addSpace(LinearLayout parent, int heightDp) {
        View space = new View(parent.getContext());
        parent.addView(space, new LinearLayout.LayoutParams(1, dp(parent.getContext(), heightDp)));
    }

    public static void clearParent(View view) {
        if (view.getParent() instanceof ViewGroup) ((ViewGroup) view.getParent()).removeView(view);
    }
}
