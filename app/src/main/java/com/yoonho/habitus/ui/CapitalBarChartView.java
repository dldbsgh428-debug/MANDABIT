package com.yoonho.habitus.ui;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.view.View;

import com.yoonho.habitus.domain.GrowthStats;
import com.yoonho.habitus.model.Capital;

public final class CapitalBarChartView extends View {
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF backgroundBar = new RectF();
    private final RectF valueBar = new RectF();
    private GrowthStats stats;

    public CapitalBarChartView(Context context) {
        super(context);
    }

    public void setStats(GrowthStats stats) {
        this.stats = stats;
        invalidate();
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int desiredHeight = UiKit.dp(getContext(), 286);
        setMeasuredDimension(resolveSize(UiKit.dp(getContext(), 320), widthMeasureSpec),
                resolveSize(desiredHeight, heightMeasureSpec));
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int max = 0;
        if (stats != null) {
            for (int value : stats.minutes.values()) max = Math.max(max, value);
        }
        int left = UiKit.dp(getContext(), 50);
        int right = getWidth() - UiKit.dp(getContext(), 42);
        int top = UiKit.dp(getContext(), 12);
        int row = UiKit.dp(getContext(), 38);
        int barHeight = UiKit.dp(getContext(), 12);

        paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        paint.setTextSize(UiKit.dp(getContext(), 12));
        paint.setTextAlign(Paint.Align.RIGHT);

        int index = 0;
        for (Capital capital : Capital.values()) {
            int y = top + index * row + UiKit.dp(getContext(), 17);
            paint.setColor(UiKit.INK);
            canvas.drawText(capital.label(), left - UiKit.dp(getContext(), 10), y + UiKit.dp(getContext(), 4), paint);
            paint.setColor(UiKit.LINE);
            backgroundBar.set(left, y, right, y + barHeight);
            canvas.drawRoundRect(backgroundBar, barHeight, barHeight, paint);
            int value = stats == null ? 0 : stats.minutes.get(capital);
            float ratio = max == 0 ? 0 : value / (float) max;
            paint.setColor(capital.color());
            valueBar.set(left, y, left + (right - left) * ratio, y + barHeight);
            canvas.drawRoundRect(valueBar, barHeight, barHeight, paint);
            paint.setTextAlign(Paint.Align.LEFT);
            paint.setColor(UiKit.MUTED);
            paint.setTypeface(android.graphics.Typeface.DEFAULT);
            canvas.drawText(value + "분", right + UiKit.dp(getContext(), 7), y + UiKit.dp(getContext(), 10), paint);
            paint.setTextAlign(Paint.Align.RIGHT);
            paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            index++;
        }
    }
}
