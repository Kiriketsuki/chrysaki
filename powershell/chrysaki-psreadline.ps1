# Chrysaki PSReadLine Theme
# Dot-source in $PROFILE: . "$HOME/.config/chrysaki/chrysaki-psreadline.ps1"
# or copy contents directly into $PROFILE

# Uses VT escape sequences for 24-bit color

# Helper: convert hex to VT escape
function _ChrHex([string]$hex) {
    $r = [Convert]::ToInt32($hex.Substring(1,2), 16)
    $g = [Convert]::ToInt32($hex.Substring(3,2), 16)
    $b = [Convert]::ToInt32($hex.Substring(5,2), 16)
    return "$([char]0x1b)[38;2;${r};${g};${b}m"
}

# Helper: background VT escape
function _ChrHexBg([string]$hex) {
    $r = [Convert]::ToInt32($hex.Substring(1,2), 16)
    $g = [Convert]::ToInt32($hex.Substring(3,2), 16)
    $b = [Convert]::ToInt32($hex.Substring(5,2), 16)
    return "$([char]0x1b)[48;2;${r};${g};${b}m"
}

Set-PSReadLineOption -Colors @{
    # -- Syntax tokens --
    Command          = (_ChrHex "#1a8a6a")  # Emerald Lt
    Parameter        = (_ChrHex "#1e8898")  # Teal
    String           = (_ChrHex "#b8a038")  # Blonde
    Operator         = (_ChrHex "#2aaab8")  # Teal Lt
    Variable         = (_ChrHex "#583090")  # Amethyst Lt
    Comment          = (_ChrHex "#6a6e82")  # Muted Text
    Number           = (_ChrHex "#d0b850")  # Blonde Lt
    Member           = (_ChrHex "#2aaab8")  # Teal Lt
    Error            = (_ChrHex "#c04050")  # Error
    Type             = (_ChrHex "#14664e")  # Emerald
    Keyword          = (_ChrHex "#1a8a6a")  # Emerald Lt

    # -- UI elements --
    Selection        = (_ChrHexBg "#252836") # Raised (bg)
    InlinePrediction = (_ChrHex "#6a6e82")  # Muted Text
    ListPrediction   = (_ChrHex "#1e8898")  # Teal
    ListPredictionSelected =
        (_ChrHex "#1a8a6a")                 # Emerald Lt
    Default          = (_ChrHex "#e0e2ea")  # Primary Text
}

# Continuation prompt styling
Set-PSReadLineOption -ContinuationPrompt (
    (_ChrHex "#363a4f") + ">> "             # Border color
)
