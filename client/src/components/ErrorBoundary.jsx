import { Component } from 'react';

/**
 * ErrorBoundary — catches any unhandled JS error inside the React tree and
 * shows a friendly recovery screen instead of a blank white page.
 *
 * Usage: wrap <App /> (or any subtree) in <ErrorBoundary>.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { crashed: true, error };
  }

  componentDidCatch(error, info) {
    // In production you'd send this to Sentry / logging service
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload() {
    window.location.reload();
  }

  handleGoHome() {
    window.location.href = '/';
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    const msg = this.state.error?.message || 'Something unexpected happened.';

    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>
            <span style={{ fontSize: 44 }}>🍽️</span>
          </div>
          <h1 style={styles.title}>Oops — something broke</h1>
          <p style={styles.subtitle}>
            The app hit an unexpected error. Your cart and preferences are safe.
          </p>
          <div style={styles.errorBox}>
            <code style={styles.errorText}>{msg}</code>
          </div>
          <div style={styles.btnRow}>
            <button style={styles.primaryBtn} onClick={this.handleReload}>
              ↺ Reload page
            </button>
            <button style={styles.ghostBtn} onClick={this.handleGoHome}>
              ← Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const styles = {
  page: {
    minHeight:      '100vh',
    background:     '#FFF8F2',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '24px 16px',
    fontFamily:     "'Inter', system-ui, sans-serif",
  },
  card: {
    background:   '#FFFFFF',
    border:       '1px solid #F0E8DF',
    borderRadius: 20,
    padding:      '40px 32px',
    maxWidth:     420,
    width:        '100%',
    textAlign:    'center',
    boxShadow:    '0 8px 32px rgba(0,0,0,0.08)',
  },
  iconWrap: {
    width:          80,
    height:         80,
    borderRadius:   '50%',
    background:     'rgba(244,82,15,0.08)',
    border:         '1px solid rgba(244,82,15,0.15)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    margin:         '0 auto 20px',
  },
  title: {
    fontSize:      22,
    fontWeight:    800,
    color:         '#1C1C1E',
    letterSpacing: '-0.025em',
    margin:        '0 0 8px',
  },
  subtitle: {
    fontSize:   14,
    color:      '#6B7280',
    lineHeight: 1.6,
    margin:     '0 0 20px',
  },
  errorBox: {
    background:   'rgba(239,68,68,0.06)',
    border:       '1px solid rgba(239,68,68,0.15)',
    borderRadius: 10,
    padding:      '12px 14px',
    marginBottom: 24,
    textAlign:    'left',
  },
  errorText: {
    fontSize:   11,
    color:      '#dc2626',
    lineHeight: 1.5,
    wordBreak:  'break-word',
    fontFamily: 'monospace',
  },
  btnRow: {
    display:   'flex',
    gap:       10,
  },
  primaryBtn: {
    flex:         1,
    padding:      '12px',
    background:   'linear-gradient(135deg, #F0A500, #F4520F)',
    color:        '#fff',
    border:       'none',
    borderRadius: 12,
    fontFamily:   "'Inter', system-ui, sans-serif",
    fontSize:     14,
    fontWeight:   700,
    cursor:       'pointer',
    boxShadow:    '0 4px 14px rgba(244,82,15,0.3)',
  },
  ghostBtn: {
    flex:         1,
    padding:      '12px',
    background:   'transparent',
    color:        '#6B7280',
    border:       '1px solid #E5E0DA',
    borderRadius: 12,
    fontFamily:   "'Inter', system-ui, sans-serif",
    fontSize:     14,
    fontWeight:   600,
    cursor:       'pointer',
  },
};
