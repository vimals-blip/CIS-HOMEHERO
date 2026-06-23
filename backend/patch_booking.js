const fs = require('fs');
const file = '/var/www/html/Urban-Service/homehero-spark/backend/server/controllers/bookingController.js';
let content = fs.readFileSync(file, 'utf8');

// Replace the dispatch logic
const oldDispatch = `    // Dispatch: prefer a customer-requested expert if they are available.
    let expert = null;
    let etaMinutes = null;
    if (!holdForPayment) {
      if (preferred_expert_id) {
        const preferredRow = await ExpertModel.findById(preferred_expert_id);
        if (preferredRow && preferredRow.status === 'ONLINE' && !Boolean(preferredRow.is_blocked)) {
          const activeBusyCount = await prisma.bookings.count({
            where: {
              expert_id: preferred_expert_id,
              status: { in: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'] },
            },
          });
          if (activeBusyCount === 0) {
            expert = preferredRow;
            etaMinutes = booking_type === 'INSTANT' ? randomEta() : null;
          }
        }
      }
      if (!expert) {
        const match = await dispatchService.findBestExpert(service_id, { lat: latVal, lng: lngVal });
        expert = match?.expert ?? null;
        etaMinutes = expert && booking_type === 'INSTANT' ? dispatchService.etaMinutes(match.distance) : null;
      }
    }`;

const newDispatch = `    // Dispatch: prefer a customer-requested expert if they are available.
    let expert = null;
    let etaMinutes = null;
    const { wait_for_offline_expert = false } = req.body;

    if (preferred_expert_id) {
      const preferredRow = await ExpertModel.findById(preferred_expert_id);
      if (preferredRow && !Boolean(preferredRow.is_blocked)) {
        if (preferredRow.status === 'ONLINE') {
          const activeBusyCount = await prisma.bookings.count({
            where: {
              expert_id: preferred_expert_id,
              status: { in: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'] },
            },
          });
          if (activeBusyCount === 0) {
            expert = preferredRow;
            etaMinutes = booking_type === 'INSTANT' ? randomEta() : null;
          }
        } else if (wait_for_offline_expert) {
          expert = preferredRow;
          etaMinutes = null; // No ETA since they are offline
        }
      }
    }

    if (!holdForPayment && !expert) {
      const match = await dispatchService.findBestExpert(service_id, { lat: latVal, lng: lngVal });
      expert = match?.expert ?? null;
      etaMinutes = expert && booking_type === 'INSTANT' ? dispatchService.etaMinutes(match.distance) : null;
    }
    
    // If we're holding for payment and didn't force a preferred expert, ensure expert is null.
    // Wait, if holdForPayment is true, and they requested a preferred expert, we SHOULD save the expert ID
    // so that when payment completes, it's already tied to them.
    if (holdForPayment && !preferred_expert_id) {
      expert = null;
      etaMinutes = null;
    }`;

content = content.replace(oldDispatch, newDispatch);
fs.writeFileSync(file, content);
console.log('Patched dispatch logic');
