// The sounds that ship inside the phone app (src/features/audio/sounds.ts), so admins can
// preview them. To change these, replace the files in assets/sounds/ and update the app.
import rain from '../../../assets/sounds/background/rain-cozy-cafe.m4a?url';
import forest from '../../../assets/sounds/background/forest-birds.m4a?url';
import ocean from '../../../assets/sounds/background/ocean-waves.m4a?url';
import lofi from '../../../assets/sounds/background/lofi-beats.m4a?url';
import velvet from '../../../assets/sounds/background/velvet-espresso.m4a?url';
import bowl from '../../../assets/sounds/notification/tibetan-bowl.m4a?url';
import chime from '../../../assets/sounds/notification/soft-chime.m4a?url';
import bell from '../../../assets/sounds/notification/desk-bell.m4a?url';
import beep from '../../../assets/sounds/notification/digital-beep.m4a?url';

export const BUILT_IN_SOUNDS = {
  background: [
    { title: 'Rain & Cozy Cafe', url: rain },
    { title: 'Forest Birds', url: forest },
    { title: 'Ocean Waves', url: ocean },
    { title: 'Lo-fi Beats', url: lofi },
    { title: 'Velvet Espresso', url: velvet },
  ],
  notification: [
    { title: 'Singing Tibetan Bowl', url: bowl },
    { title: 'Soft Chime', url: chime },
    { title: 'Desk Bell', url: bell },
    { title: 'Digital Beep', url: beep },
  ],
};
