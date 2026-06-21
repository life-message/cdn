import page from "https://cdn.jsdelivr.net/npm/page@1.11.6/+esm";
import { SEOManager } from "./seo.js";
import { ResourceManager } from "./resources.js";

class SPARouter {
    constructor() {
        this.pagesDir = "/pages";
        this.routesConfig = null;
        this.htmlCache = new Map();
        this.defaultExtensions = ["html", "htm"];

        this.seoManager = new SEOManager();
        this.resourceManager = new ResourceManager();
    }

    async init() {
        await this.loadRoutesConfig();
        page("*", (ctx) => this.loadPage(ctx.path));
        page.start();
    }

    async loadRoutesConfig() {
        try {
            const res = await fetch(`${location.origin}/routes.json`);
            this.routesConfig = res.ok ? await res.json() : { routes: [] };
        } catch {
            this.routesConfig = { routes: [] };
        }
    }

    normalizePath(path) {
        let p = path.split("?")[0].split("#")[0];
        p = p.replace(/\/{2,}/g, "/");
        if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
        return p || "/";
    }

    getRouteConfig(path) {
        const p = this.normalizePath(path);
        return this.routesConfig?.routes?.find(
            (r) => this.normalizePath(r.path) === p,
        );
    }

    async loadPage(path) {
        const normalizedPath = this.normalizePath(path);
        const routeConfig = this.getRouteConfig(normalizedPath);

        try {
            const pageData = routeConfig
                ? await this.getPageData(routeConfig)
                : await this.resolveByConvention(normalizedPath);

            if (!pageData) {
                this.show404(normalizedPath);
                return;
            }

            this.renderPage(pageData);
        } catch (error) {
            console.error(`Error loading page for "${normalizedPath}":`, error);
            this.show404(normalizedPath);
        }
    }

    async resolveByConvention(normalizedPath) {
        const fileBase =
            normalizedPath === "/" ? "home" : normalizedPath.slice(1);

        for (const ext of this.defaultExtensions) {
            try {
                const cached = await this.getCachedHtml(`${fileBase}.${ext}`);
                return { ...cached, seo: cached.extractedSEO };
            } catch {}
        }

        return null;
    }

    renderPage(pageData) {
        this.seoManager.update(pageData.seo);
        document.body.innerHTML = pageData.bodyContent;
        this.resourceManager.loadStyles(pageData.styles);
        this.resourceManager.loadScripts(pageData.headScripts, "head");
        this.resourceManager.loadScripts(pageData.bodyScripts, "body");
    }

    async getPageData(routeConfig) {
        const cached = await this.getCachedHtml(routeConfig.page);
        return {
            ...cached,
            seo: routeConfig.seo || cached.extractedSEO,
        };
    }

    async getCachedHtml(pageFile) {
        if (this.htmlCache.has(pageFile)) return this.htmlCache.get(pageFile);

        const res = await fetch(`${this.pagesDir}/${pageFile}`);
        if (!res.ok) throw new Error(`Page file not found: ${pageFile}`);

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const baseUrl = `${location.origin}${this.pagesDir}/${pageFile}`;
        this.resolveRelativeUrls(doc, "script[src]", "src", baseUrl);
        this.resolveRelativeUrls(
            doc,
            'link[rel="stylesheet"][href]',
            "href",
            baseUrl,
        );

        const parsed = {
            bodyContent: doc.body.innerHTML,
            styles: Array.from(
                doc.head.querySelectorAll('link[rel="stylesheet"], style'),
            ),
            headScripts: Array.from(doc.head.querySelectorAll("script")),
            bodyScripts: Array.from(doc.body.querySelectorAll("script")),
            extractedSEO: this.extractSEO(doc.head),
        };

        this.htmlCache.set(pageFile, parsed);
        return parsed;
    }

    resolveRelativeUrls(doc, selector, attr, baseUrl) {
        doc.querySelectorAll(selector).forEach((el) => {
            const value = el.getAttribute(attr);
            if (!value) return;
            if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(value)) return;
            if (value.startsWith("/") || value.startsWith("data:")) return;

            el.setAttribute(attr, new URL(value, baseUrl).pathname);
        });
    }

    extractSEO(head) {
        const seo = {
            title: head.querySelector("title")?.textContent || "",
            description:
                head.querySelector('meta[name="description"]')?.content || "",
            keywords:
                head.querySelector('meta[name="keywords"]')?.content || "",
            author: head.querySelector('meta[name="author"]')?.content || "",
            robots: head.querySelector('meta[name="robots"]')?.content || "",
        };

        const ogTitle = head.querySelector('meta[property="og:title"]');
        const ogDesc = head.querySelector('meta[property="og:description"]');
        const ogImg = head.querySelector('meta[property="og:image"]');

        if (ogTitle) seo.ogTitle = ogTitle.content;
        if (ogDesc) seo.ogDescription = ogDesc.content;
        if (ogImg) seo.ogImage = ogImg.content;

        return seo;
    }

    async show404(path) {
        const notFoundRoute = this.getRouteConfig("/404");
        if (notFoundRoute) {
            try {
                const pageData = await this.getPageData(notFoundRoute);
                this.renderPage(pageData);
                return;
            } catch (error) {
                console.error('Error loading "/404" page:', error);
            }
        }

        this.renderFallback404(path);
    }

    renderFallback404(path) {
        document.title = "404 - Page Not Found";
        document.body.innerHTML = `
          <div style="text-align: center; padding: 50px;">
            <h1>❌ 404 - Page Not Found</h1>
            <p>Страница <strong>${path}</strong> не существует.</p>
            <a href="/" onclick="page('/'); return false;">На главную</a>
          </div>
        `;
    }
}

const router = new SPARouter();
router.init();
window.page = page;
