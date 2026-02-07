/**
 * Draw.io postMessage communication protocol
 */

export type DrawioAction =
  | { action: 'load'; xml: string; autosave?: 0 | 1 }
  | { action: 'export'; format: 'xml' | 'svg' | 'xmlsvg' }
  | { action: 'configure'; config: Record<string, unknown> };

export type DrawioEvent =
  | { event: 'init' }
  | { event: 'save'; xml: string }
  | { event: 'autosave'; xml: string }
  | { event: 'export'; data: string; format: string; xml: string }
  | { event: 'configure' };

export class DrawioClient {
  private iframe: HTMLIFrameElement;
  private messageHandlers: Map<string, (event: DrawioEvent) => void> = new Map();

  constructor(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
    this.setupMessageListener();
  }

  private setupMessageListener() {
    window.addEventListener('message', (event) => {
      // Security check: ensure message is from draw.io iframe
      if (event.source !== this.iframe.contentWindow) {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.event) {
          const handler = this.messageHandlers.get(data.event);
          if (handler) {
            handler(data);
          }
        }
      } catch (e) {
        console.error('Failed to parse draw.io message:', e);
      }
    });
  }

  sendAction(action: DrawioAction) {
    if (!this.iframe.contentWindow) {
      console.error('iframe contentWindow not available');
      return;
    }

    const message = JSON.stringify(action);
    this.iframe.contentWindow.postMessage(message, '*');
  }

  on(event: string, handler: (event: DrawioEvent) => void) {
    this.messageHandlers.set(event, handler);
  }

  off(event: string) {
    this.messageHandlers.delete(event);
  }

  loadXml(xml: string) {
    this.sendAction({ action: 'load', xml, autosave: 0 });
  }

  exportXml() {
    this.sendAction({ action: 'export', format: 'xml' });
  }

  configure(config: Record<string, unknown>) {
    this.sendAction({ action: 'configure', config });
  }

  destroy() {
    this.messageHandlers.clear();
  }
}
