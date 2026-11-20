import { NAV_ORDER, shellCopy } from '../copy'

describe('shared shell copy', () => {
  it('exports four distinct Arabic nav labels in the fixed navigation order', () => {
    const labels = NAV_ORDER.map((key) => shellCopy.nav[key])

    expect(labels).toHaveLength(4)
    expect(new Set(labels).size).toBe(labels.length)
    expect(NAV_ORDER).toEqual(['home', 'today', 'adhkar', 'more'])
    expect(labels).toEqual(['الرئيسية', 'اليوم', 'الأذكار', 'المزيد'])
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
