import { useEffect, useState } from 'react';
import { Icon } from './Icon';

// One shared player, so starting one sound stops the one that was playing.
const player = new Audio();
let listeners: (() => void)[] = [];
const notify = () => listeners.forEach((l) => l());
player.addEventListener('ended', notify);
player.addEventListener('pause', notify);
player.addEventListener('play', notify);

export function PlayButton({ url, label }: { url: string; label: string }) {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  const playing = !player.paused && player.src === new URL(url, location.href).href;
  return (
    <button
      className={`icon-btn play-btn${playing ? ' on' : ''}`}
      aria-label={`${playing ? 'Pause' : 'Play'} ${label}`}
      onClick={() => {
        if (playing) player.pause();
        else { player.src = url; void player.play(); }
      }}>
      <Icon name={playing ? 'pause' : 'play'} size={13} strokeWidth={1.5} />
    </button>
  );
}
