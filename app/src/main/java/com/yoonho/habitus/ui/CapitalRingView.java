package com.yoonho.habitus.ui;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.view.View;

import com.yoonho.habitus.domain.GrowthStats;
import com.yoonho.habitus.model.Capital;

public final class CapitalRingView extends View {
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF oval = new RectF();
    private GrowthStats stats;

    public CapitalRingView(Context context) {
        super(context);
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);
    }

    public void setStats(GrowthStats stats) {
        this.stats = stats;
        invalidate();
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int desired = UiKit.dp(getContext(), 164);
        setMeasuredDimension(resolveSize(desired, widthMeasureSpec), resolveSize(desired, heightMeasureSpec));
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float size = Math.min(getWidth(), getHeight());
        float inset = UiKit.dp(getContext(), 18);
        oval.set((getWidth() - size) / 2f + inset, inset,
                (getWidth() + size) / 2f - inset, size - inset);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(UiKit.dp(getContext(), 13));
        paint.setStrokeCap(Paint.Cap.ROUND);

        float segment = 360f / Capital.values().length;
        float gap = 7f;
        float start = -90f;
        for (Capital capital : Capital.values()) {
            int minutes = stats == null ? 0 : stats.minutes.get(capital);
            int alpha = minutes == 0 ? 55 : Math.min(255, 110 + minutes * 3);
            paint.setColor(withAlpha(capital.color(), alpha));
            canvas.drawArc(oval, start + gap / 2f, segment - gap, false, paint);
            start += segment;
        }

        paint.setStyle(Paint.Style.FILL);
        paint.setColor(UiKit.INK);
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        paint.setTextSize(UiKit.dp(getContext(), 25));
        int score = stats == null ? 0 : stats.balanceScore;
        canvas.drawText(score + "점", getWidth() / 2f, getHeight() / 2f + UiKit.dp(getContext(), 2), paint);
        paint.setTypeface(android.graphics.Typeface.DEFAULT);
        paint.setTextSize(UiKit.dp(getContext(), 11));
        paint.setColor(UiKit.MUTED);
        canvas.drawText("성장 균형", getWidth() / 2f, getHeight() / 2f + UiKit.dp(getContext(), 22), paint);
    }

    private int withAlpha(int color, int alpha) {
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    }
}
