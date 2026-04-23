import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.badge}>Next.js + TypeScript</p>
        <h1>Smart Irrigation Frontend (New)</h1>
        <p className={styles.subtitle}>
          This is the new Next.js app scaffolded for the project. The existing
          Vite frontend in <code>/web</code> stays unchanged.
        </p>

        <section className={styles.cards}>
          <article className={styles.card}>
            <h2>Status</h2>
            <p>Base app initialized and build-tested.</p>
          </article>
          <article className={styles.card}>
            <h2>Gateway URL</h2>
            <p>Set <code>NEXT_PUBLIC_API_BASE_URL</code> in <code>.env.local</code>.</p>
          </article>
          <article className={styles.card}>
            <h2>Next Step</h2>
            <p>Start building pages and migrate features from the old frontend.</p>
          </article>
        </section>

        <div className={styles.ctas}>
          <a className={styles.primary} href="http://localhost:3000">
            Local App
          </a>
          <a className={styles.secondary} href="https://nextjs.org/docs">
            Next.js Docs
          </a>
        </div>
      </main>
    </div>
  );
}
