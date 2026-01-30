const products = [
  // Page 1 - Items 1-10 (fixing duplicate "1." in original)
  { id: 1, name: "Fluted Profile-3", dimensions: "145 x 18mm", code: "4400000665", price: 348, category: "fluted" },
  { id: 2, name: "Hollow Box Profile", dimensions: "100 x 50mm", code: "4400000661", price: 395, category: "hollow-box" },
  { id: 3, name: "Cladding Profile", dimensions: "112 x 15mm", code: "4400000664", price: 184, category: "cladding" },
  { id: 4, name: "C Channel Profile", dimensions: "50 x 50 x 6mm", code: "4400000660", price: 170, category: "c-channel" },
  { id: 5, name: "Rod Profile", dimensions: "25mm diameter", code: "4400000668", price: 173, category: "rod" },
  { id: 6, name: "C Channel Profile", dimensions: "100 x 30 x 16mm", code: "4400000670", price: 157, category: "c-channel" },
  { id: 7, name: "Serrated Profile", dimensions: "100 x 20mm", code: "4400000671", price: 399, category: "serrated" },
  { id: 8, name: "Strip", dimensions: "50 x 25mm", code: "4400000685", price: 308, category: "strip" },
  { id: 9, name: "Sheet Profile", dimensions: "100 x 8mm", code: "4400000680", price: 169, category: "sheet" },
  { id: 10, name: "Sheet Profile", dimensions: "100 x 10mm", code: "4400000681", price: 210, category: "sheet" },

  // Page 2 - Items 11-22
  { id: 11, name: "Sheet Profile", dimensions: "100 x 12mm", code: "4400000689", price: 252, category: "sheet" },
  { id: 12, name: "Sheet Profile", dimensions: "150 x 8mm", code: "4400000688", price: 254, category: "sheet" },
  { id: 13, name: "Sheet Profile", dimensions: "150 x 10mm", code: "4400000687", price: 318, category: "sheet" },
  { id: 14, name: "Sheet Profile", dimensions: "150 x 12mm", code: "4400000686", price: 378, category: "sheet" },
  { id: 15, name: "Cladding Profile", dimensions: "58 x 15mm", code: "4400000690", price: 117, category: "cladding" },
  { id: 16, name: "Cladding Profile", dimensions: "98 x 15mm", code: "4400000691", price: 185, category: "cladding" },
  { id: 17, name: "Louver", dimensions: "150 x 35mm", code: "4400000051", price: 350, category: "louver" },
  { id: 18, name: "Hollow Box", dimensions: "150 x 25mm", code: "4400000010", price: 380, category: "hollow-box" },
  { id: 19, name: "Solid Box", dimensions: "150 x 25mm", code: "4400000011", price: 685, category: "solid-box" },
  { id: 20, name: "Door Profile", dimensions: "100 x 20mm", code: "4400000040", price: 200, category: "door" },
  { id: 21, name: "Door Profile", dimensions: "100 x 20 x 6mm", code: "4400000054", price: 274, category: "door" },
  { id: 22, name: "Door Profile Solid", dimensions: "100 x 20mm", code: "4400000031", price: 397, category: "door" },

  // Page 3 - Items 23-36
  { id: 23, name: "Door Profile", dimensions: "85 x 31mm", code: "4400000265", price: 315, category: "door" },
  { id: 24, name: "Door Frame Profile", dimensions: "85 x 31mm", code: "4400000025", price: 347, category: "door" },
  { id: 25, name: "Single Door Frame", dimensions: "85 x 31mm", code: "4400000044", price: 335, category: "door" },
  { id: 26, name: "Sheet Profile", dimensions: "100 x 6mm", code: "4400000052", price: 134, category: "sheet" },
  { id: 27, name: "Sheet Profile", dimensions: "200 x 11mm", code: "4400000020", price: 437, category: "sheet" },
  { id: 28, name: "Sheet Profile", dimensions: "200 x 7mm", code: "4400000029", price: 304, category: "sheet" },
  { id: 29, name: "Sheet Profile", dimensions: "400 x 11mm", code: "4400000034", price: 899, category: "sheet" },
  { id: 30, name: "Sheet Profile", dimensions: "400 x 7mm", code: "4400000035", price: 518, category: "sheet" },
  { id: 31, name: "Strip", dimensions: "55 x 10mm", code: "4400000583", price: 119, category: "strip" },
  { id: 32, name: "Strip Profile", dimensions: "80 x 11mm", code: "4400000053", price: 187, category: "strip" },
  { id: 33, name: "Strip", dimensions: "40 x 20mm", code: "4400000027", price: 265, category: "strip" },
  { id: 34, name: "Hollow Strip Profile", dimensions: "40 x 20mm", code: "4400000055", price: 160, category: "hollow-strip" },
  { id: 35, name: "Hollow Strip", dimensions: "50 x 25mm", code: "4400000048", price: 187, category: "hollow-strip" },
  { id: 36, name: "Strip", dimensions: "45 x 10mm", code: "4400000047", price: 108, category: "strip" },

  // Page 4 - Items 37-49
  { id: 37, name: "L-Angle", dimensions: "30 x 30 x 4mm", code: "4400000024", price: 69, category: "l-angle" },
  { id: 38, name: "L-Angle", dimensions: "40 x 40 x 4mm", code: "4400000045", price: 81, category: "l-angle" },
  { id: 39, name: "Louver", dimensions: "75 x 20mm", code: "4400000005", price: 115, category: "louver" },
  { id: 40, name: "Solid Louver", dimensions: "75 x 20mm", code: "4400000043", price: 278, category: "solid-louver" },
  { id: 41, name: "Round Pipe", dimensions: "80 x 10mm", code: "4400000036", price: 383, category: "round-pipe" },
  { id: 42, name: "C-Channel", dimensions: "100 x 30 x 6mm", code: "4400000582", price: 164, category: "c-channel" },
  { id: 43, name: "C-Channel", dimensions: "84 x 30 x 6mm", code: "4400000012", price: 164, category: "c-channel" },
  { id: 44, name: "I-Beam Profile", dimensions: "38 x 6mm", code: "4400000590", price: 80, category: "i-beam" },
  { id: 45, name: "Rod Profile", dimensions: "9mm diameter", code: "4400000007", price: 53, category: "rod" },
  { id: 46, name: "Rod Profile", dimensions: "8mm diameter", code: "4400000026", price: 48, category: "rod" },
  { id: 47, name: "Rod Profile", dimensions: "6mm diameter", code: "4400000667", price: 46, category: "rod" },
  { id: 48, name: "Square Profile", dimensions: "50 x 50 x 6mm", code: "4400000058", price: 233, category: "square" },
  { id: 49, name: "Strip Profile", dimensions: "80 x 6mm", code: "4400000057", price: 119, category: "strip" },

  // Page 5 - Items 50-54
  { id: 50, name: "Square Profile", dimensions: "100 x 100 x 8mm", code: "4400000578", price: 573, category: "square" },
  { id: 51, name: "Square Box Profile", dimensions: "150 x 150mm", code: "4400000586", price: 1290, category: "square" },
  { id: 52, name: "Strip Profile", dimensions: "60 x 6mm", code: "4400000581", price: 104, category: "strip" },
  { id: 53, name: "Railing Profile", dimensions: "65 x 32.5mm", code: "4400000060", price: 257, category: "railing" },
  { id: 54, name: "Hollow Box Profile", dimensions: "150 x 50mm", code: "4400000591", price: 625, category: "hollow-box" },
  { id: 55, name: "Round Pipe Profile", dimensions: "150 x 10mm", code: "4400000588", price: 752, category: "round-pipe" }
];

const categories = [
  { id: "all", name: "All", icon: "grid" },
  { id: "sheet", name: "Sheets", icon: "square" },
  { id: "strip", name: "Strips", icon: "minus" },
  { id: "hollow-strip", name: "Hollow Strip", icon: "box-minus" },
  { id: "door", name: "Door", icon: "door-open" },
  { id: "hollow-box", name: "Hollow Box", icon: "box" },
  { id: "c-channel", name: "C-Channel", icon: "bracket" },
  { id: "cladding", name: "Cladding", icon: "layers" },
  { id: "louver", name: "Louver", icon: "blinds" },
  { id: "solid-louver", name: "Solid Louver", icon: "blinds-filled" },
  { id: "rod", name: "Rod", icon: "circle" },
  { id: "square", name: "Square", icon: "square-outline" },
  { id: "round-pipe", name: "Round Pipe", icon: "pipe" },
  { id: "l-angle", name: "L-Angle", icon: "corner" },
  { id: "fluted", name: "Fluted", icon: "wave" },
  { id: "serrated", name: "Serrated", icon: "zigzag" },
  { id: "solid-box", name: "Solid Box", icon: "cube" },
  { id: "i-beam", name: "I-Beam", icon: "beam" },
  { id: "railing", name: "Railing", icon: "railing" }
];

const contactInfo = {
  address: "No.274/17, New Guddahalli, Mysore Road, Bangalore Urban, Karnataka 560026, India",
  phone: "+91 80 26744030",
  mobile: "+91 9449697772",
  email: "info@kayuandkov.com",
  website: "www.kayuandkov.com"
};
