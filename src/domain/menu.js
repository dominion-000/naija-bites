// menu.js — "Naija Bites" menu.
//
// options makes the customer go through a sub-choice before the item land in the cart

const MENU = [
  {
    id: 1,
    name: "Jollof Rice & Chicken",
    price: 2500,
    options: [
      { name: "Chicken Part", choices: ["Breast", "Thigh", "Wing"] },
      { name: "Spice Level", choices: ["Mild", "Hot", "Extra Hot"] },
    ],
  },
  {
    id: 2,
    name: "Beef Suya Wrap",
    price: 1800,
    options: [{ name: "Size", choices: ["Regular", "Large"] }],
  },
  {
    id: 3,
    name: "Fried Plantain (Dodo)",
    price: 800,
    options: [],
  },
  {
    id: 4,
    name: "Chapman (Chilled Drink)",
    price: 1200,
    options: [],
  },
  {
    id: 5,
    name: "Egusi Soup & Pounded Yam",
    price: 3000,
    options: [{ name: "Protein", choices: ["Beef", "Fish", "Assorted"] }],
  },
];

module.exports = MENU;
