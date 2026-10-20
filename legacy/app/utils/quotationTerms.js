export const DEFAULT_QUOTATION_TERMS = [
  {
    id: 'modifications',
    text: 'Any modification or correction to the quotation must be requested before the purchase order is released.',
  },
  {
    id: 'rates',
    text: 'The above rates are ex-factory and inclusive of discount.',
  },
  {
    id: 'approved-products',
    text: 'All products quoted above are as approved by your team.',
  },
  {
    id: 'gst-inclusive',
    text: 'GST is inclusive in each item.',
  },
  {
    id: 'freight',
    text: 'Freight/transportation charges are included (paid basis).',
  },
  {
    id: 'delivery',
    text: 'Delivery depends on stock availability at the warehouse after the purchase order is received.',
  },
  {
    id: 'packing',
    text: 'Advance payment and purchase order quantities should be in multiples of the given packing size.',
  },
];

export const DEFAULT_SELECTED_QUOTATION_TERMS = DEFAULT_QUOTATION_TERMS.map(({ id }) => id);
