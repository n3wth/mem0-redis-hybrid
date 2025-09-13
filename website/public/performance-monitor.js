// Performance monitoring for Recall website
(function() {
  if (typeof window === 'undefined') return

  // Core Web Vitals measurement
  function measureWebVitals() {
    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            console.log('FCP:', entry.startTime)
          }
        }
      })
      observer.observe({ entryTypes: ['paint'] })

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.log('LCP:', lastEntry.startTime)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay (via event timing)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime
            console.log('FID:', fid)
          }
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            console.log('CLS:', clsValue)
          }
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    }

    // Bundle size monitoring
    if (performance.getEntriesByType) {
      window.addEventListener('load', () => {
        const resources = performance.getEntriesByType('resource')
        const jsSize = resources
          .filter(r => r.name.includes('.js'))
          .reduce((acc, r) => acc + (r.transferSize || 0), 0)
        const cssSize = resources
          .filter(r => r.name.includes('.css'))
          .reduce((acc, r) => acc + (r.transferSize || 0), 0)
        
        console.log('JS Bundle Size:', (jsSize / 1024).toFixed(2), 'KB')
        console.log('CSS Bundle Size:', (cssSize / 1024).toFixed(2), 'KB')
      })
    }
  }

  // Initialize monitoring in development
  if (window.location.hostname === 'localhost') {
    measureWebVitals()
  }
})()