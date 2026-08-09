package com.nabd.app;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class CountdownWorker extends Worker {

    public CountdownWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        CountdownFormatter.post(getApplicationContext());
        return Result.success();
    }
}