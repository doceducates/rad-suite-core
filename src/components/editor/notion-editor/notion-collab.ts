import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { CollabUserInfo } from './notion-editor-types';

export interface CollabSession {
  doc: Y.Doc;
  provider?: WebrtcProvider;
  fragment: Y.XmlFragment;
  cleanup: () => void;
}

const activeProviders = new Map<string, { provider: WebrtcProvider; doc: Y.Doc }>();

export function createCollabSession(
  roomId?: string,
  user?: CollabUserInfo
): CollabSession {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment('radsuite-report-blocks');

  if (!roomId || typeof window === 'undefined') {
    return {
      doc,
      fragment,
      cleanup: () => doc.destroy(),
    };
  }

  const roomName = `radsuite-room-${roomId}`;

  // If a provider for this room already exists (e.g. React StrictMode re-mount), destroy the old one first
  if (activeProviders.has(roomName)) {
    try {
      const existing = activeProviders.get(roomName);
      existing?.provider.destroy();
      existing?.doc.destroy();
    } catch {
      // ignore
    }
    activeProviders.delete(roomName);
  }

  let provider: WebrtcProvider | undefined;
  try {
    provider = new WebrtcProvider(roomName, doc, {
      signaling: [
        'wss://signaling.yjs.dev',
        'wss://y-webrtc-signaling-eu.herokuapp.com',
      ],
    });

    if (user && provider.awareness) {
      provider.awareness.setLocalStateField('user', {
        name: user.name,
        color: user.color,
      });
    }

    activeProviders.set(roomName, { provider, doc });
  } catch (err) {
    console.warn('[NotionCollab] WebRTC signaling error, using local doc:', err);
  }

  const cleanup = () => {
    try {
      if (activeProviders.get(roomName)?.provider === provider) {
        activeProviders.delete(roomName);
      }
      provider?.destroy();
      doc.destroy();
    } catch {
      // ignore
    }
  };

  return { doc, provider, fragment, cleanup };
}
