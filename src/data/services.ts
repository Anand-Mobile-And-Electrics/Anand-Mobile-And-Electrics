import { 
  Smartphone, 
  Headphones, 
  Landmark, 
  Wifi, 
  FileText, 
  Printer, 
  PenTool, 
  Lightbulb 
} from 'lucide-react';
import React from 'react';

export interface ServiceCategory {
  id: string;
  title: string;
  shortDescription: string;
  icon: React.ElementType;
  items: string[];
}

export const services: ServiceCategory[] = [
  {
    id: 'mobile-repairing',
    title: 'Mobile Repairing',
    shortDescription: 'Professional repair services for smartphones and keypad/feature phones.',
    icon: Smartphone,
    items: [
      'Display/screen repair',
      'Battery replacement',
      'Charging-port repair',
      'Software issues',
      'Water/liquid damage',
      'Keypad/feature phone repair',
      'General smartphone repair'
    ]
  },
  {
    id: 'mobile-accessories',
    title: 'Mobile Accessories',
    shortDescription: 'Enhance your mobile experience with high-quality accessories.',
    icon: Headphones,
    items: [
      'Mobile covers/cases',
      'Earphones',
      'Earbuds',
      'Neckbands',
      'Chargers',
      'Cables',
      'Mobile stands',
      'Other mobile accessories'
    ]
  },
  {
    id: 'digital-financial-services',
    title: 'Money Transfer & AEPS',
    shortDescription: 'Money transfer and AEPS services for your everyday digital financial needs.',
    icon: Landmark,
    items: [
      'AEPS',
      'Money transfer'
    ]
  },
  {
    id: 'recharge-dth',
    title: 'Recharge & DTH',
    shortDescription: 'Quick recharges for all major mobile networks and DTH providers.',
    icon: Wifi,
    items: [
      'Mobile recharge',
      'DTH recharge'
    ]
  },
  {
    id: 'government-e-governance',
    title: 'PAN Card & Voter ID Services',
    shortDescription: 'PAN Card and Voter ID services with assistance for applications and related processes.',
    icon: FileText,
    items: [
      'PAN card services',
      'Voter ID services'
    ]
  },
  {
    id: 'printing-documentation',
    title: 'Xerox & Lamination',
    shortDescription: 'High-quality printing, photocopying, and document lamination.',
    icon: Printer,
    items: [
      'Xerox / photocopy',
      'Lamination'
    ]
  },
  {
    id: 'electrical-repairing',
    title: 'Electrical Repairing',
    shortDescription: "Reliable repair services for electrical and electronic products within our shop's service range.",
    icon: PenTool,
    items: [
      'Electrical repairs',
      'Electronic repairs'
    ]
  },
  {
    id: 'electrical-sales',
    title: 'Electrical & Electronics Products',
    shortDescription: 'Electrical and electronic products for everyday household and personal use, including fans, coolers, speakers, bulbs, electrical boards, wires, decorative lights, and related items.',
    icon: Lightbulb,
    items: [
      'Electrical wires and tape',
      'Fans and coolers',
      'Home-theatre/tower speakers',
      'Bulbs and decorative lights',
      'Electrical boards',
      'Mixer machine jars'
    ]
  }
];
