-- chrysaki.lua — Chrysaki colorscheme for Neovim
-- Hard geometric dark theme — zero border-radius aesthetic
-- All colors traceable to Chrysaki palette tokens

vim.cmd("highlight clear")
if vim.fn.exists("syntax_on") then
  vim.cmd("syntax reset")
end
vim.g.colors_name = "chrysaki"
vim.o.termguicolors = true

-- ─── Palette Constants ───────────────────────────────────────────────

-- Surfaces
local abyss     = "#0f1117"   -- deepest bg, modal backdrop
local base      = "#161821"   -- primary canvas
local surface   = "#1c1f2b"   -- cards, sidebars
local raised    = "#252836"   -- hover, popups
local elevated  = "#2e3142"   -- tooltips, floats
local border    = "#363a4f"   -- dividers

-- Primary Accents
local emerald      = "#14664e"   -- growth, creation
local emerald_lt   = "#1a8a6a"   -- functions, links
local emerald_dim  = "#0e4a38"   -- subtle green
local blue         = "#122858"   -- structure, navigation
local blue_lt      = "#1c3d7a"   -- depth, fill
local amethyst     = "#3a2068"   -- creativity, identity
local amethyst_lt  = "#583090"   -- keywords, focus

-- Secondary Accents
local teal      = "#197278"   -- transitional, info
local teal_lt   = "#20969c"   -- types, parameters
local blonde    = "#FBB13C"   -- emphasis, strings
local blonde_lt = "#FCC96A"   -- numbers, highlights
local err       = "#8C2F39"   -- errors

-- Text
local text_primary   = "#e0e2ea"
local text_secondary = "#a0a4b8"
local text_muted     = "#6a6e82"
local text_inverse   = "#0f1117"

-- ─── Helper ──────────────────────────────────────────────────────────

local function hl(group, opts)
  vim.api.nvim_set_hl(0, group, opts)
end

-- ─── Editor UI ───────────────────────────────────────────────────────

hl("Normal",        { fg = text_primary, bg = base })
hl("NormalFloat",   { fg = text_primary, bg = surface })
hl("FloatBorder",   { fg = border, bg = surface })
hl("Visual",        { bg = raised })
hl("Search",        { fg = text_inverse, bg = blonde })
hl("IncSearch",     { fg = text_inverse, bg = blonde_lt })
hl("CursorLine",    { bg = elevated })
hl("CursorLineNr",  { fg = blonde_lt, bg = elevated, bold = true })
hl("LineNr",        { fg = text_muted })
hl("SignColumn",    { bg = base })
hl("ColorColumn",   { bg = surface })
hl("Folded",        { fg = text_muted, bg = surface })
hl("FoldColumn",    { fg = text_muted, bg = base })
hl("NonText",       { fg = border })
hl("SpecialKey",    { fg = border })
hl("MatchParen",    { fg = blonde_lt, bold = true, underline = true })
hl("Conceal",       { fg = text_muted })
hl("Directory",     { fg = emerald_lt })
hl("Title",         { fg = text_primary, bold = true })
hl("Question",      { fg = emerald_lt })
hl("MoreMsg",       { fg = emerald_lt })
hl("WarningMsg",    { fg = blonde })
hl("ErrorMsg",      { fg = err, bold = true })
hl("ModeMsg",       { fg = text_primary, bold = true })
hl("WildMenu",      { fg = text_inverse, bg = blonde })

-- ─── Statusline / Tabline ────────────────────────────────────────────

hl("StatusLine",    { fg = text_primary, bg = surface })
hl("StatusLineNC",  { fg = text_muted, bg = blue })
hl("TabLine",       { fg = text_secondary, bg = surface })
hl("TabLineSel",    { fg = text_primary, bg = raised, bold = true })
hl("TabLineFill",   { fg = text_muted, bg = blue })

-- ─── Splits ──────────────────────────────────────────────────────────

hl("VertSplit",     { fg = border })
hl("WinSeparator",  { fg = border })

-- ─── Popup Menu ──────────────────────────────────────────────────────

hl("Pmenu",         { fg = text_primary, bg = surface })
hl("PmenuSel",      { fg = text_inverse, bg = emerald })
hl("PmenuSbar",     { bg = raised })
hl("PmenuThumb",    { bg = border })

-- ─── Diagnostics ─────────────────────────────────────────────────────

hl("DiagnosticError",          { fg = err })
hl("DiagnosticWarn",           { fg = blonde })
hl("DiagnosticInfo",           { fg = teal })
hl("DiagnosticHint",           { fg = teal })
hl("DiagnosticUnderlineError", { sp = err, undercurl = true })
hl("DiagnosticUnderlineWarn",  { sp = blonde, undercurl = true })
hl("DiagnosticUnderlineInfo",  { sp = teal, undercurl = true })
hl("DiagnosticUnderlineHint",  { sp = teal, undercurl = true })

-- ─── Diff ────────────────────────────────────────────────────────────

hl("DiffAdd",      { bg = emerald_dim })
hl("DiffChange",   { bg = blue })
hl("DiffDelete",   { fg = err, bg = abyss })
hl("DiffText",     { bg = blue_lt })

-- ─── Git Gutter ──────────────────────────────────────────────────────

hl("GitGutterAdd",    { fg = emerald_lt })
hl("GitGutterChange", { fg = blonde })
hl("GitGutterDelete", { fg = err })

-- ─── Syntax Highlighting ─────────────────────────────────────────────

hl("Comment",     { fg = text_muted, italic = true })  -- Muted
hl("Keyword",     { fg = amethyst_lt, bold = true })    -- Amethyst Lt
hl("Statement",   { fg = amethyst_lt })                 -- Amethyst Lt
hl("Conditional", { fg = amethyst_lt })                 -- Amethyst Lt
hl("Repeat",      { fg = amethyst_lt })                 -- Amethyst Lt
hl("Label",       { fg = amethyst_lt })                 -- Amethyst Lt
hl("Exception",   { fg = amethyst_lt })                 -- Amethyst Lt
hl("Function",    { fg = emerald_lt })                  -- Emerald Lt
hl("String",      { fg = blonde })                      -- Blonde
hl("Character",   { fg = blonde })                      -- Blonde
hl("Number",      { fg = blonde_lt })                   -- Blonde Lt
hl("Float",       { fg = blonde_lt })                   -- Blonde Lt
hl("Boolean",     { fg = blonde_lt })                   -- Blonde Lt
hl("Constant",    { fg = blonde_lt })                   -- Blonde Lt
hl("Type",        { fg = teal_lt })                     -- Teal Lt
hl("StorageClass",{ fg = amethyst_lt })                 -- Amethyst Lt
hl("Structure",   { fg = teal_lt })                     -- Teal Lt
hl("Typedef",     { fg = teal_lt })                     -- Teal Lt
hl("Identifier",  { fg = text_primary })                -- Primary text
hl("PreProc",     { fg = amethyst_lt })                 -- Amethyst Lt
hl("Include",     { fg = amethyst_lt })                 -- Amethyst Lt
hl("Define",      { fg = amethyst_lt })                 -- Amethyst Lt
hl("Macro",       { fg = amethyst_lt })                 -- Amethyst Lt
hl("Special",     { fg = blonde })                      -- Blonde (builtins)
hl("SpecialChar", { fg = blonde })                      -- Blonde
hl("Tag",         { fg = emerald_lt })                  -- Emerald Lt
hl("Delimiter",   { fg = text_secondary })              -- Secondary text
hl("Operator",    { fg = text_secondary })              -- Secondary text
hl("Error",       { fg = err })                         -- Error
hl("Todo",        { fg = blonde, bold = true })         -- Blonde bold
hl("Underlined",  { fg = emerald_lt, underline = true })

-- ─── TreeSitter Highlights ───────────────────────────────────────────

hl("@keyword",              { fg = amethyst_lt, bold = true })   -- Amethyst Lt
hl("@keyword.function",     { fg = amethyst_lt })                -- Amethyst Lt
hl("@keyword.return",       { fg = amethyst_lt })                -- Amethyst Lt
hl("@keyword.operator",     { fg = text_secondary })             -- Secondary
hl("@conditional",          { fg = amethyst_lt })                -- Amethyst Lt
hl("@repeat",               { fg = amethyst_lt })                -- Amethyst Lt
hl("@exception",            { fg = amethyst_lt })                -- Amethyst Lt
hl("@function",             { fg = emerald_lt })                 -- Emerald Lt
hl("@function.builtin",     { fg = blonde })                     -- Blonde (builtins)
hl("@function.call",        { fg = emerald_lt })                 -- Emerald Lt
hl("@method",               { fg = emerald_lt })                 -- Emerald Lt
hl("@method.call",          { fg = emerald_lt })                 -- Emerald Lt
hl("@constructor",          { fg = teal_lt })                    -- Teal Lt
hl("@string",               { fg = blonde })                     -- Blonde
hl("@string.escape",        { fg = blonde_lt })                  -- Blonde Lt
hl("@string.regex",         { fg = blonde })                     -- Blonde
hl("@number",               { fg = blonde_lt })                  -- Blonde Lt
hl("@float",                { fg = blonde_lt })                  -- Blonde Lt
hl("@boolean",              { fg = blonde_lt })                  -- Blonde Lt
hl("@type",                 { fg = teal_lt })                    -- Teal Lt
hl("@type.builtin",         { fg = teal_lt })                    -- Teal Lt
hl("@type.definition",      { fg = teal_lt })                    -- Teal Lt
hl("@variable",             { fg = text_primary })               -- Primary text
hl("@variable.builtin",     { fg = blonde })                     -- Blonde (special)
hl("@parameter",            { fg = teal_lt })                    -- Teal Lt
hl("@field",                { fg = text_primary })               -- Primary text
hl("@property",             { fg = text_primary })               -- Primary text
hl("@comment",              { fg = text_muted, italic = true })  -- Muted
hl("@operator",             { fg = text_secondary })             -- Secondary
hl("@punctuation.bracket",  { fg = text_secondary })             -- Secondary
hl("@punctuation.delimiter",{ fg = text_secondary })             -- Secondary
hl("@punctuation.special",  { fg = text_secondary })             -- Secondary
hl("@namespace",            { fg = teal_lt })                    -- Teal Lt
hl("@decorator",            { fg = amethyst_lt })                -- Amethyst Lt
hl("@attribute",            { fg = amethyst_lt })                -- Amethyst Lt
hl("@tag",                  { fg = emerald_lt })                 -- Emerald Lt
hl("@tag.delimiter",        { fg = text_secondary })             -- Secondary
hl("@tag.attribute",        { fg = teal_lt })                    -- Teal Lt
hl("@text",                 { fg = text_primary })               -- Primary text
hl("@text.strong",          { bold = true })
hl("@text.emphasis",        { italic = true })
hl("@text.uri",             { fg = emerald_lt, underline = true })
hl("@text.todo",            { fg = blonde, bold = true })
hl("@text.danger",          { fg = err })
hl("@text.warning",         { fg = blonde })
hl("@text.note",            { fg = teal })
