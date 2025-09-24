export function supportsId(eventName?: string): boolean {
  if (!eventName) return false;
  return (
    eventName === 'Rocks and Minerals' ||
    eventName === 'Entomology' ||
    eventName === 'Anatomy - Nervous' ||
    eventName === 'Anatomy - Endocrine' ||
    eventName === 'Anatomy - Sense Organs' ||
    eventName === 'Dynamic Planet - Oceanography' ||
    eventName === 'Water Quality - Freshwater' ||
    eventName === 'Remote Sensing' ||
    eventName === 'Circuit Lab' ||
    eventName === 'Astronomy' ||
    eventName === 'Designer Genes' ||
    eventName === 'Forensics'
  );
}

export function buildFrqPrompt(eventName?: string): string {
  if (!eventName) return 'Identify the specimen shown in the image.';
  if (eventName === 'Entomology') return 'Identify the scientific name shown in the image.';
  if (eventName === 'Rocks and Minerals') return 'Identify the mineral shown in the image.';
  if (eventName.startsWith('Anatomy')) return 'Identify the anatomical structure shown in the image.';
  if (eventName.startsWith('Dynamic Planet')) return 'Identify the geological feature shown in the image.';
  if (eventName === 'Water Quality - Freshwater') return 'Identify the water quality indicator shown in the image.';
  if (eventName === 'Remote Sensing') return 'Analyze the remote sensing data shown in the image.';
  if (eventName === 'Circuit Lab') return 'Analyze the circuit diagram or measurement shown in the image.';
  if (eventName === 'Designer Genes') return 'Identify the genetic structure or process shown in the image.';
  if (eventName === 'Forensics') return 'Analyze the forensic evidence shown in the image.';
  return 'Identify the specimen shown in the image.';
}


