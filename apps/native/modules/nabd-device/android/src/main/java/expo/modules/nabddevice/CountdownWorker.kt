package expo.modules.nabddevice

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

class CountdownWorker(
  context: Context,
  workerParams: WorkerParameters,
) : Worker(context, workerParams) {
  override fun doWork(): Result {
    CountdownNotificationService.refresh(applicationContext)
    return Result.success()
  }
}
