import { describe, expect, it } from 'vitest'

import { NAV_ORDER, shellCopy } from '../../index'

describe('shared shell copy', () => {
  it('exports five distinct Arabic nav labels in the fixed navigation order', () => {
    const labels = NAV_ORDER.map((key) => shellCopy.nav[key])

    expect(labels).toHaveLength(5)
    expect(new Set(labels).size).toBe(labels.length)
    expect(NAV_ORDER).toEqual(['libraries', 'prayerTimes', 'home', 'stats', 'settings'])
    expect(labels).toEqual(['المكتبات', 'المواقيت', 'الرئيسية', 'الإحصائيات', 'الإعدادات'])
  })

  it('keeps the reusable shell lines Arabic and distinct from the nav labels', () => {
    expect(shellCopy.appName).toBe('نبض')
    expect(shellCopy.navAriaLabel).toBe('التنقل الرئيسي')
    expect(shellCopy.back).toBe('رجوع')
    expect(shellCopy.themeToggle).toBe('تبديل المظهر الليلي')
    expect(shellCopy.loading).toBe('جارٍ التحميل…')
    expect(shellCopy.retry).toBe('إعادة المحاولة')
    expect(shellCopy.error).toBe('حدث خطأ ما. حاول مرة أخرى.')
    expect(shellCopy.notFound).toBe('الصفحة غير موجودة')

    const navValues = Object.values(shellCopy.nav)
    for (const line of [
      shellCopy.back,
      shellCopy.loading,
      shellCopy.retry,
      shellCopy.error,
      shellCopy.notFound,
      shellCopy.returnHome,
      shellCopy.returnLanding,
    ]) {
      expect(navValues).not.toContain(line)
    }
  })
})
