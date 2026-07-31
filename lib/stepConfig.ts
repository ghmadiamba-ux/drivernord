import type { StepId } from './conversation';

export type StepType = 'options' | 'text' | 'email' | 'terminal' | 'consent';

export interface BilingualString {
  sv: string;
  en: string;
}

export interface StepOption {
  label: BilingualString;
  value: string;
}

export interface StepDef {
  type: StepType;
  question: BilingualString;
  options?: StepOption[];
  placeholder?: BilingualString;
  inputMode?: 'text' | 'tel' | 'email';
  message?: BilingualString;
}

export const STEP_CONFIG: Partial<Record<StepId, StepDef>> = {
  lang: {
    type: 'options',
    question: { sv: 'Välj språk / Choose language', en: 'Välj språk / Choose language' },
    options: [
      { label: { sv: 'Svenska', en: 'Svenska' }, value: 'sv' },
      { label: { sv: 'English', en: 'English' }, value: 'en' },
    ],
  },

  region: {
    type: 'options',
    question: {
      sv: 'Var är du baserad?',
      en: 'Which region are you based in?',
    },
    options: [
      { label: { sv: 'Stockholmsregionen', en: 'Stockholm region' }, value: 'stockholm' },
      { label: { sv: 'Annan region i Sverige', en: 'Another region in Sweden' }, value: 'other_sweden' },
      { label: { sv: 'Utanför Sverige', en: 'Outside Sweden' }, value: 'abroad' },
    ],
  },

  relocate: {
    type: 'options',
    question: {
      sv: 'Är du öppen för att arbeta tillfälligt i Stockholmsområdet?',
      en: 'Are you open to working temporarily in the Stockholm area?',
    },
    options: [
      { label: { sv: 'Ja, det är okej', en: 'Yes, I\'m open to it' }, value: 'yes' },
      { label: { sv: 'Nej, jag stannar i min region', en: 'No, I prefer my region' }, value: 'no' },
    ],
  },

  license: {
    type: 'options',
    question: {
      sv: 'Vilket körkort har du?',
      en: 'What type of driving license do you hold?',
    },
    options: [
      { label: { sv: 'C — Lastbil', en: 'C — Rigid truck' }, value: 'C' },
      { label: { sv: 'CE — Lastbil + släp', en: 'CE — Truck + trailer' }, value: 'CE' },
      { label: { sv: 'D — Buss / Coach', en: 'D — Bus / Coach' }, value: 'D' },
      { label: { sv: 'C + D', en: 'C + D' }, value: 'C+D' },
      { label: { sv: 'CE + D', en: 'CE + D' }, value: 'CE+D' },
      { label: { sv: 'Inget av dessa', en: 'None of these' }, value: 'none' },
    ],
  },

  ykb: {
    type: 'options',
    question: {
      sv: 'Vad är statusen på ditt YKB?',
      en: 'What is the status of your YKB (professional competence certificate)?',
    },
    options: [
      { label: { sv: 'Giltigt YKB', en: 'Valid YKB' }, value: 'valid' },
      { label: { sv: 'Utgånget YKB', en: 'YKB expired' }, value: 'expired' },
      { label: { sv: 'Pågående utbildning', en: 'Currently in training' }, value: 'in_progress' },
      { label: { sv: 'Inget YKB', en: 'I don\'t have one' }, value: 'none' },
      { label: { sv: 'Vet inte', en: 'Don\'t know' }, value: 'unknown' },
    ],
  },

  driver_card: {
    type: 'options',
    question: {
      sv: 'Har du ett giltigt förarkort?',
      en: 'Do you have a valid driver card (tachograph card)?',
    },
    options: [
      { label: { sv: 'Ja, giltigt', en: 'Yes, valid' }, value: 'valid' },
      { label: { sv: 'Ja, men utgånget', en: 'Yes, but expired' }, value: 'expired' },
      { label: { sv: 'Nej', en: 'No' }, value: 'no' },
      { label: { sv: 'Vet inte', en: 'Don\'t know' }, value: 'unknown' },
    ],
  },

  domain: {
    type: 'options',
    question: {
      sv: 'Vilket är ditt primära transportområde?',
      en: 'What is your primary transport domain?',
    },
    options: [
      { label: { sv: 'Distribution / stadstransport', en: 'Distribution / city transport' }, value: 'distribution' },
      { label: { sv: 'Schakt & bygg',                 en: 'Construction & earthworks'     }, value: 'schakt_bygg'    },
      { label: { sv: 'Tipp / lastväxlare',            en: 'Tipper / hook-lift'            }, value: 'tipp'          },
      { label: { sv: 'Kyl & frys',                    en: 'Refrigerated / cold chain'     }, value: 'kylfrys'       },
      { label: { sv: 'Kran / hiab',                   en: 'Crane / HIAB'                  }, value: 'kran'          },
      { label: { sv: 'ADR / farligt gods',            en: 'ADR / hazardous goods'         }, value: 'adr'           },
      { label: { sv: 'Fjärrtransport / långkörning',  en: 'Long-haul / national'          }, value: 'fjarrtransport'},
      { label: { sv: 'Hoppa över / vet inte',         en: 'Skip / not sure'               }, value: 'skip'          },
    ],
  },

  availability: {
    type: 'options',
    question: {
      sv: 'När kan du börja?',
      en: 'When are you available to start?',
    },
    options: [
      { label: { sv: 'Nu direkt', en: 'Available now' }, value: 'now' },
      { label: { sv: 'Inom 2 veckor', en: 'Within 2 weeks' }, value: '2_weeks' },
      { label: { sv: 'Inom 1 månad', en: 'Within 1 month' }, value: '1_month' },
      { label: { sv: 'Inte just nu', en: 'Not available yet' }, value: 'not_yet' },
    ],
  },

  shift_preference: {
    type: 'options',
    question: {
      sv: 'Vilka arbetstider passar dig?',
      en: 'What working hours suit you?',
    },
    options: [
      { label: { sv: 'Dagtid',                       en: 'Day shifts'        }, value: 'day'      },
      { label: { sv: 'Natt',                         en: 'Night shifts'      }, value: 'night'    },
      { label: { sv: 'Helg',                         en: 'Weekends'          }, value: 'weekend'  },
      { label: { sv: 'Flexibelt / spelar ingen roll', en: 'Flexible / any'   }, value: 'flexible' },
      { label: { sv: 'Hoppa över',                   en: 'Skip'              }, value: 'skip'     },
    ],
  },

  phone: {
    type: 'text',
    question: {
      sv: 'Vad är ditt telefonnummer?',
      en: 'What is your phone number?',
    },
    placeholder: { sv: '+46...', en: '+46...' },
    inputMode: 'tel',
  },

  email: {
    type: 'email',
    question: {
      sv: 'Vad är din e-postadress?',
      en: 'What is your email address?',
    },
    placeholder: { sv: 'Valfritt', en: 'Optional' },
    inputMode: 'email',
  },

  name: {
    type: 'text',
    question: {
      sv: 'Vad heter du?',
      en: 'What is your first name?',
    },
    placeholder: { sv: 'Ditt förnamn', en: 'Your first name' },
    inputMode: 'text',
  },

  consent: {
    type: 'consent',
    question: {
      sv: 'Godkänn innan vi registrerar dig',
      en: 'Your consent before we register you',
    },
    message: {
      sv: 'Jag samtycker till att DriverNord lagrar och behandlar mina uppgifter för att kunna matcha mig med relevanta transportföretag. Mina uppgifter delas inte med något företag utan mitt separata godkännande.',
      en: 'I consent to DriverNord storing and processing my data to match me with relevant transport companies. My data will not be shared with any company without my separate approval.',
    },
  },

  bemanning_open: {
    type: 'options',
    question: {
      sv: 'Är du öppen för uppdrag via bemannings- eller rekryteringsföretag?',
      en: 'Are you open to assignments through staffing or recruitment companies?',
    },
    options: [
      {
        label: {
          sv: 'Ja — DriverNord får matcha mig med bemanningsföretag',
          en: 'Yes — DriverNord may match me with staffing companies',
        },
        value: 'yes',
      },
      {
        label: {
          sv: 'Nej — enbart direktmatchning med åkerier',
          en: 'No — direct matching with transport companies only',
        },
        value: 'no',
      },
    ],
  },

  confirmation: {
    type: 'terminal',
    question: { sv: 'Tack!', en: 'Thank you!' },
    message: {
      sv: 'Vi har registrerat din profil. Vi kontaktar dig inom kort.',
      en: 'We have registered your profile. We will contact you shortly.',
    },
  },

  disqualified: {
    type: 'terminal',
    question: {
      sv: 'Det passar inte just nu.',
      en: 'Not a match right now.',
    },
    message: {
      sv: 'DriverNord matchar CE- och C-förare med transportföretag i Stockholm. Tjänsten kräver ett yrkeskörkort (C, CE eller D) med giltig YKB. Om du tar körkort i framtiden är du välkommen tillbaka.',
      en: 'DriverNord matches CE and C drivers with transport companies in Stockholm. The service requires a professional driving licence (C, CE or D) with valid YKB. You are welcome back if that changes.',
    },
  },
};
