import { Inngest } from 'inngest';

// RF-307: cliente Inngest compartido. El id identifica la app en el dashboard.
// INNGEST_EVENT_KEY es leído por el SDK de process.env en runtime.
export const inngest = new Inngest({ id: 'cambiala' });
