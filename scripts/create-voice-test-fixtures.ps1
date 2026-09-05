param([string]$OutputDirectory = "$PSScriptRoot/../outputs/voice-tests/baseline")
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$targetDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $englishVoice = $speaker.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'en-US' } | Select-Object -First 1
  if (-not $englishVoice) { throw 'No installed English speech voice. Supply recorded WAV clips instead.' }
  $speaker.SelectVoice($englishVoice.VoiceInfo.Name)
  $lines = @{
    'amenities.wav' = 'Tell me about the amenities at Pelican Beach Resort.'
    'interrupt.wav' = 'Wait, I have another question. What time is check in?'
    'weather.wav' = 'What is the weather usually like in November in Destin?'
    'booking.wav' = 'I want to book a condo.'
    'two.wav' = 'Two adults, no children.'
  }
  foreach ($name in $lines.Keys) {
    $targetFile = Join-Path $targetDirectory $name
    if (Test-Path -LiteralPath $targetFile) { throw "Refusing to overwrite $targetFile" }
    $speaker.SetOutputToWaveFile($targetFile)
    $speaker.Speak($lines[$name])
    $speaker.SetOutputToNull()
  }
} finally { $speaker.Dispose() }
Copy-Item -LiteralPath "$PSScriptRoot/../tests/fixtures/voice-suite.json" -Destination (Join-Path $targetDirectory 'suite.json')
Write-Output "Local speech fixtures created in $targetDirectory. No paid TTS was used."
