// Fonte compartilhada entre configurações e formulário de fichas
// As Google Fonts são carregadas no layout.tsx via <link>

export type FontOption = { value: string; label: string; category: string }

export const FONT_OPTIONS: FontOption[] = [
  // ── Serifadas clássicas ────────────────────────────────────────────────────
  { value: "Georgia, serif",                              label: "Georgia",              category: "Clássica" },
  { value: "'Playfair Display', Georgia, serif",          label: "Playfair Display",     category: "Clássica" },
  { value: "'Cormorant Garamond', Garamond, serif",       label: "Cormorant Garamond",   category: "Clássica" },
  { value: "'EB Garamond', Garamond, serif",              label: "EB Garamond",          category: "Clássica" },
  { value: "Lora, Georgia, serif",                        label: "Lora",                 category: "Clássica" },
  { value: "Merriweather, Georgia, serif",                label: "Merriweather",         category: "Clássica" },
  { value: "'Crimson Text', Georgia, serif",              label: "Crimson Text",         category: "Clássica" },
  { value: "'Libre Baskerville', Baskerville, serif",     label: "Libre Baskerville",    category: "Clássica" },
  { value: "Cinzel, Georgia, serif",                      label: "Cinzel",               category: "Clássica" },
  { value: "'Palatino Linotype', Palatino, serif",        label: "Palatino",             category: "Clássica" },
  { value: "'Times New Roman', Times, serif",             label: "Times New Roman",      category: "Clássica" },
  { value: "'Book Antiqua', Palatino, serif",             label: "Book Antiqua",         category: "Clássica" },

  // ── Modernas / Sans-serif ──────────────────────────────────────────────────
  { value: "Montserrat, Arial, sans-serif",               label: "Montserrat",           category: "Moderna" },
  { value: "Raleway, Arial, sans-serif",                  label: "Raleway",              category: "Moderna" },
  { value: "Poppins, Arial, sans-serif",                  label: "Poppins",              category: "Moderna" },
  { value: "'Josefin Sans', Arial, sans-serif",           label: "Josefin Sans",         category: "Moderna" },
  { value: "'Nunito', Arial, sans-serif",                 label: "Nunito",               category: "Moderna" },
  { value: "'Quicksand', Arial, sans-serif",              label: "Quicksand",            category: "Moderna" },
  { value: "'Trebuchet MS', sans-serif",                  label: "Trebuchet",            category: "Moderna" },
  { value: "Verdana, sans-serif",                         label: "Verdana",              category: "Moderna" },
  { value: "Arial, sans-serif",                           label: "Arial",                category: "Moderna" },
  { value: "Tahoma, sans-serif",                          label: "Tahoma",               category: "Moderna" },

  // ── Manuscritas / Cursivas ─────────────────────────────────────────────────
  { value: "'Great Vibes', cursive",                      label: "Great Vibes",          category: "Manuscrita" },
  { value: "'Dancing Script', cursive",                   label: "Dancing Script",       category: "Manuscrita" },
  { value: "Sacramento, cursive",                         label: "Sacramento",           category: "Manuscrita" },
  { value: "Pacifico, cursive",                           label: "Pacifico",             category: "Manuscrita" },
  { value: "'Pinyon Script', cursive",                    label: "Pinyon Script",        category: "Manuscrita" },
  { value: "'Alex Brush', cursive",                       label: "Alex Brush",           category: "Manuscrita" },
  { value: "'Brush Script MT', cursive",                  label: "Brush Script",         category: "Manuscrita" },
  { value: "'Tangerine', cursive",                        label: "Tangerine",            category: "Manuscrita" },
]

// URL do Google Fonts com todas as fontes necessárias
export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Dancing+Script:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Great+Vibes&family=Josefin+Sans:wght@400;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Montserrat:wght@400;600;700&family=Nunito:wght@400;600;700&family=Pacifico&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Poppins:wght@400;500;600;700&family=Quicksand:wght@400;600;700&family=Raleway:wght@400;600;700&family=Sacramento&family=Tangerine:wght@400;700&display=swap"
