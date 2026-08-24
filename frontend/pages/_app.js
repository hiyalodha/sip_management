import Head from 'next/head';
import '../styles/globals.css';
import { ToastProvider } from '../components/Toast';

export default function App({ Component, pageProps }) {
  return (
    <ToastProvider>
      <Head>
        <title>SIP Manager</title>
        <meta name="description" content="Track and manage your Systematic Investment Plans" />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%234f46e5'/%3E%3Ctext x='12' y='17' font-size='14' font-family='sans-serif' font-weight='bold' fill='white' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E"
        />
      </Head>
      <Component {...pageProps} />
    </ToastProvider>
  );
}
