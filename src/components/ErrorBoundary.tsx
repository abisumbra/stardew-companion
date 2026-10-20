import { Component, type ReactNode } from 'react';
import { translate } from '../lib/locale';
import { downloadJson } from '../lib/downloads';

export class ErrorBoundary extends Component<
  { children: ReactNode; section?: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="panel" role="alert" style={{ margin: '2rem', maxWidth: 640 }}>
        <h1>{translate('This view could not be displayed')}</h1>
        <p>{translate('Your saved plans are kept. Reload the application to try again.')}</p>
        <button
          className="button"
          onClick={() =>
            this.props.section ? this.setState({ failed: false }) : window.location.reload()
          }
        >
          {translate(this.props.section ? 'Retry this section' : 'Reload application')}
        </button>
        <button
          className="button"
          onClick={() =>
            downloadJson('companion-diagnostics.json', {
              format: 'companion-diagnostics',
              version: 1,
              at: new Date().toISOString(),
              section: this.props.section ?? 'Application',
              failure: 'render-failed',
              language: document.documentElement.lang,
              note: 'Save contents, personal paths, names and raw exception messages are excluded.',
            })
          }
        >
          {translate('Export local diagnostics')}
        </button>
      </main>
    );
  }
}
