export interface KeralaDistrictInfo {
  id: string;
  name: string;
  malayalam: string;
  lat: number;
  lng: number;
  centerSpot: string;
}

export const KERALA_DISTRICTS: KeralaDistrictInfo[] = [
  {
    id: 'thiruvananthapuram',
    name: 'Thiruvananthapuram',
    malayalam: 'തിരുവനന്തപുരം',
    lat: 8.5061,
    lng: 76.9558,
    centerSpot: 'Secretariat, Kowdiar',
  },
  {
    id: 'kollam',
    name: 'Kollam',
    malayalam: 'കൊല്ലം',
    lat: 8.8932,
    lng: 76.6141,
    centerSpot: 'Kollam Beach, Clock Tower',
  },
  {
    id: 'pathanamthitta',
    name: 'Pathanamthitta',
    malayalam: 'പത്തനംതിട്ട',
    lat: 9.2648,
    lng: 76.7870,
    centerSpot: 'Town Center, Aranmula',
  },
  {
    id: 'alappuzha',
    name: 'Alappuzha',
    malayalam: 'ആലപ്പുഴ',
    lat: 9.4981,
    lng: 76.3388,
    centerSpot: 'Vembanad Backwaters, Beach',
  },
  {
    id: 'kottayam',
    name: 'Kottayam',
    malayalam: 'കോട്ടയം',
    lat: 9.5916,
    lng: 76.5222,
    centerSpot: 'Thirunakkara, Kumarakom',
  },
  {
    id: 'idukki',
    name: 'Idukki',
    malayalam: 'ഇടുക്കി',
    lat: 9.8500,
    lng: 76.9700,
    centerSpot: 'Munnar, Painavu',
  },
  {
    id: 'ernakulam',
    name: 'Ernakulam',
    malayalam: 'എറണാകുളം',
    lat: 9.9816,
    lng: 76.2799,
    centerSpot: 'Marine Drive, Kochi',
  },
  {
    id: 'thrissur',
    name: 'Thrissur',
    malayalam: 'തൃശ്ശൂർ',
    lat: 10.5276,
    lng: 76.2144,
    centerSpot: 'Swaraj Round, Vadakkumnathan',
  },
  {
    id: 'palakkad',
    name: 'Palakkad',
    malayalam: 'പാലക്കാട്',
    lat: 10.7867,
    lng: 76.6548,
    centerSpot: 'Palakkad Fort, Malampuzha',
  },
  {
    id: 'malappuram',
    name: 'Malappuram',
    malayalam: 'മലപ്പുറം',
    lat: 11.0510,
    lng: 76.0711,
    centerSpot: 'Down Hill, Kottakunnu',
  },
  {
    id: 'kozhikode',
    name: 'Kozhikode',
    malayalam: 'കോഴിക്കോട്',
    lat: 11.2588,
    lng: 75.7804,
    centerSpot: 'Kozhikode Beach, Mananchira',
  },
  {
    id: 'wayanad',
    name: 'Wayanad',
    malayalam: 'വയനാട്',
    lat: 11.6854,
    lng: 76.1320,
    centerSpot: 'Kalpetta, Banasura Sagar',
  },
  {
    id: 'kannur',
    name: 'Kannur',
    malayalam: 'കണ്ണൂർ',
    lat: 11.8745,
    lng: 75.3704,
    centerSpot: 'Payyambalam Beach, St. Angelo Fort',
  },
  {
    id: 'kasaragod',
    name: 'Kasaragod',
    malayalam: 'കാസർഗോഡ്',
    lat: 12.4996,
    lng: 74.9869,
    centerSpot: 'Bekal Fort, Chandragiri',
  },
];

export const getDistrictById = (id: string): KeralaDistrictInfo => {
  const found = KERALA_DISTRICTS.find((d) => d.id === id);
  return found || KERALA_DISTRICTS[9]; // Default Malappuram
};
