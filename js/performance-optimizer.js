/**
 * Performance Optimization Module
 * Implements lazy loading and performance best practices
 */

class PerformanceOptimizer {
    constructor() {
        this.aiGuardianLoaded = false;
        this.metricsEnabled = true;
    }

    /**
     * Lazy load AI Guardian scripts when needed
     */
    async loadAIGuardian() {
        if (this.aiGuardianLoaded) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            // Scripts already deferred in HTML, just mark as loaded
            this.aiGuardianLoaded = true;
            
            // Wait for scripts to load
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Initialize Web Performance APIs monitoring
     */
    monitorPerformance() {
        if (!this.metricsEnabled) return;

        // Report Core Web Vitals
        if ('PerformanceObserver' in window) {
            try {
                // Largest Contentful Paint (LCP)
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    console.debug('LCP:', lastEntry.renderTime || lastEntry.loadTime);
                });

                // Cumulative Layout Shift (CLS)
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            console.debug('CLS:', entry.value);
                        }
                    }
                });

                // First Input Delay (FID)
                const fidObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        console.debug('FID:', entry.processingDuration);
                    }
                });

                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
                clsObserver.observe({ type: 'layout-shift', buffered: true });
                fidObserver.observe({ type: 'first-input', buffered: true });
            } catch (error) {
                console.warn('Performance monitoring not available:', error);
            }
        }
    }

    /**
     * Optimize images with modern formats
     */
    optimizeImages() {
        const images = document.querySelectorAll('img');
        images.forEach((img) => {
            // Add lazy loading attribute
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }

            // Add preload for critical images
            if (img.classList.contains('critical')) {
                img.removeAttribute('loading');
            }
        });
    }

    /**
     * Batch DOM updates to reduce reflows
     */
    batchDOMUpdates(callback) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout: 2000 });
        } else {
            setTimeout(callback, 0);
        }
    }

    /**
     * Prefetch critical resources
     */
    prefetchResources() {
        const criticalResources = [
            'js/acoustic-detector.js',
            'js/voice-trigger.js',
            'js/ai-guardian.js',
            'js/processor.js'
        ];

        const head = document.head;
        criticalResources.forEach((resource) => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = resource;
            link.as = 'script';
            head.appendChild(link);
        });
    }

    /**
     * Cache static resources
     */
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            // Check if service worker exists before registering
            navigator.serviceWorker.register('sw.js').catch((error) => {
                console.debug('Service Worker registration optional:', error);
            });
        }
    }

    /**
     * Defer non-critical CSS
     */
    deferNonCriticalCSS() {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach((link) => {
            if (!link.classList.contains('critical')) {
                link.media = 'print';
                link.onload = function () {
                    this.media = 'all';
                };
            }
        });
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            domInteractive: navigation.domInteractive - navigation.fetchStart,
            totalTime: navigation.loadEventEnd - navigation.fetchStart
        };
    }
}

// Create global instance and auto-initialize
window.performanceOptimizer = new PerformanceOptimizer();

document.addEventListener('DOMContentLoaded', () => {
    performanceOptimizer.monitorPerformance();
    performanceOptimizer.optimizeImages();
    performanceOptimizer.prefetchResources();
});

// Print performance metrics when page loads
window.addEventListener('load', () => {
    const metrics = performanceOptimizer.getPerformanceReport();
    console.log('📊 Performance Metrics:', metrics);
});
