#Requires -Version 5.1
<#
.SYNOPSIS
    Build and run the flow-field simulator and its matplotlib telemetry monitor.

.DESCRIPTION
    One entry point for the whole pipeline. Locates the MinGW toolchain and the
    repo's virtualenv, configures and builds the CMake project, then launches the
    raylib simulator and the Python monitor on the same DDS domain.

    The DDS domain is compiled into the executable, so -Domain is passed to CMake
    at configure time AND to flow_monitor.py, keeping the two ends in sync.

.PARAMETER Task
    all       build, launch the simulator, then run the monitor (default)
    build     configure + build only
    sim       launch the simulator only
    monitor   run the matplotlib monitor only
    bindings  generate and build the Fast DDS Python type support
    clean     delete the build directory

.PARAMETER Domain
    DDS domain id for both ends. Default 0.

.PARAMETER FastDds
    Fast DDS install prefix, forwarded as CMAKE_PREFIX_PATH. Without it CMake
    falls back to the null telemetry backend and the simulator runs standalone.

.PARAMETER NoDds
    Force the null telemetry backend even if Fast DDS is installed.

.PARAMETER Rebuild
    Delete the build directory before configuring.

.EXAMPLE
    .\run.ps1
    Build and run the simulator (null backend if Fast DDS is not installed).

.EXAMPLE
    .\run.ps1 -FastDds C:\Fast-DDS\install -Domain 7
    Full pipeline with telemetry on domain 7.

.EXAMPLE
    .\run.ps1 -Task sim
    Just launch the already-built simulator.
#>
[CmdletBinding()]
param(
    [ValidateSet('all', 'build', 'sim', 'monitor', 'bindings', 'clean')]
    [string]$Task = 'all',

    [ValidateRange(0, 232)]
    [int]$Domain = 0,

    [string]$FastDds = '',

    [ValidateRange(1, 240)]
    [int]$Hz = 20,

    [ValidateSet('Release', 'Debug', 'RelWithDebInfo')]
    [string]$BuildType = 'Release',

    [switch]$NoDds,
    [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'

$Root      = $PSScriptRoot
$BuildDir  = Join-Path $Root 'build'
$Exe       = Join-Path $BuildDir 'FlowFieldTelemetry.exe'
$MonitorPy = Join-Path $Root 'python\flow_monitor.py'
$RepoRoot  = Split-Path (Split-Path (Split-Path $Root))

#------------------------------------------------------------------------------
# Helpers
#------------------------------------------------------------------------------
function Write-Step {
    param([string]$Message)
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Note {
    param([string]$Message)
    Write-Host "    $Message" -ForegroundColor DarkGray
}

function Write-Fail {
    <#
        Expected, user-facing failures: print advice and exit. `throw` is kept
        for genuine internal errors, where the stack trace is the useful part.
    #>
    param([string]$Message, [string[]]$Hints = @())
    Write-Host ''
    Write-Host "ERROR: $Message" -ForegroundColor Red
    foreach ($hint in $Hints) { Write-Host "    $hint" -ForegroundColor DarkGray }
    Write-Host ''
    exit 1
}

function Find-FastDds {
    <#
        Locate a Fast DDS install prefix so -FastDds is only needed for installs
        in unusual places. A prefix is accepted when it carries the DDS headers.
    #>
    $candidates = @()
    foreach ($var in @($env:FASTDDS_HOME, $env:FASTDDSHOME, $env:FASTRTPS_HOME)) {
        if ($var) { $candidates += $var }
    }
    foreach ($glob in @('C:\Program Files\eProsima\*',
                        'C:\Program Files (x86)\eProsima\*',
                        'C:\eProsima\*',
                        'C:\Fast-DDS*')) {
        $candidates += (Get-Item -Path $glob -ErrorAction SilentlyContinue |
                        ForEach-Object { $_.FullName })
    }

    foreach ($candidate in $candidates) {
        if (-not $candidate) { continue }
        foreach ($marker in @('include\fastdds', 'include\fastrtps')) {
            if (Test-Path -LiteralPath (Join-Path $candidate $marker)) { return $candidate }
        }
    }
    return $null
}

function Resolve-Tool {
    <# PATH first, then the usual Windows install locations. #>
    param(
        [Parameter(Mandatory)][string]$Name,
        [string[]]$Candidates = @()
    )
    # Select-Object -First 1: Get-Command returns every match on PATH, and an
    # array of paths would be joined into one nonsense command string.
    $found = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue |
             Select-Object -First 1
    if ($found) { return $found.Source }
    foreach ($candidate in $Candidates) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    return $null
}

function Invoke-Checked {
    <# Run a native command and stop the script if it fails. #>
    param(
        [Parameter(Mandatory)][string]$Exe,
        [Parameter(Mandatory)][string[]]$Arguments,
        [string]$What = 'command'
    )
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$What failed with exit code $LASTEXITCODE"
    }
}

function Get-PythonExe {
    <# Prefer the repo virtualenv; it already has matplotlib and numpy. #>
    $venv = Join-Path $RepoRoot '.venv\Scripts\python.exe'
    if (Test-Path -LiteralPath $venv) { return $venv }
    $python = Resolve-Tool -Name 'python'
    if (-not $python) { throw 'No Python interpreter found (looked for .venv and PATH).' }
    return $python
}

function Get-BindingPaths {
    <#
        Locate the generated FlowTelemetry module. A multi-config generator drops
        it under a Release/ subfolder, a single-config one does not, so glob for
        it rather than guessing.
    #>
    $generated = Join-Path $BuildDir 'python_ts'
    if (-not (Test-Path -LiteralPath $generated)) { return @() }
    $hits = Get-ChildItem -LiteralPath $generated -Recurse -File `
                          -Include 'FlowTelemetry.py', '_FlowTelemetry*.pyd' `
                          -ErrorAction SilentlyContinue
    return ($hits | ForEach-Object { $_.DirectoryName } | Sort-Object -Unique)
}

#------------------------------------------------------------------------------
# Toolchain
#------------------------------------------------------------------------------
function Initialize-Toolchain {
    $script:CMake = Resolve-Tool -Name 'cmake' -Candidates @(
        'C:\mingw64\bin\cmake.exe',
        'C:\msys64\mingw64\bin\cmake.exe',
        'C:\Program Files\CMake\bin\cmake.exe'
    )
    if (-not $script:CMake) { throw 'cmake not found. Install it or add it to PATH.' }

    $script:Ninja = Resolve-Tool -Name 'ninja' -Candidates @(
        'C:\mingw64\bin\ninja.exe',
        'C:\msys64\mingw64\bin\ninja.exe'
    )

    $script:Gxx = Resolve-Tool -Name 'g++' -Candidates @(
        'C:\msys64\mingw64\bin\g++.exe',
        'C:\mingw64\bin\g++.exe'
    )
    if (-not $script:Gxx) { throw 'g++ not found. Install MSYS2/MinGW or add it to PATH.' }

    # CMake shells out to the compiler and the generator, so both must be on PATH.
    foreach ($tool in @($script:Gxx, $script:Ninja, $script:CMake)) {
        if (-not $tool) { continue }
        $dir = Split-Path $tool
        if (($env:PATH -split ';') -notcontains $dir) {
            $env:PATH = "$dir;$env:PATH"
        }
    }

    Write-Note "cmake : $($script:CMake)"
    Write-Note "g++   : $($script:Gxx)"
    if ($script:Ninja) { Write-Note "ninja : $($script:Ninja)" }

    $raylib = 'C:\raylib\raylib\src\libraylib.a'
    if (-not (Test-Path -LiteralPath $raylib)) {
        Write-Warning "raylib static library not found at $raylib. CMakeLists.txt expects it there."
    } else {
        Write-Note "raylib: $raylib"
    }
}

#------------------------------------------------------------------------------
# Tasks
#------------------------------------------------------------------------------
function Invoke-Clean {
    Write-Step 'Cleaning'
    if (Test-Path -LiteralPath $BuildDir) {
        Remove-Item -LiteralPath $BuildDir -Recurse -Force
        Write-Note "removed $BuildDir"
    } else {
        Write-Note 'nothing to clean'
    }
}

function Invoke-Build {
    Initialize-Toolchain

    if ($Rebuild -and (Test-Path -LiteralPath $BuildDir)) {
        Write-Step 'Removing previous build directory (-Rebuild)'
        Remove-Item -LiteralPath $BuildDir -Recurse -Force
    }

    Write-Step "Configuring (domain $Domain, $Hz Hz, $BuildType)"

    $configure = @('-S', $Root, '-B', $BuildDir,
                   "-DCMAKE_BUILD_TYPE=$BuildType",
                   "-DCMAKE_CXX_COMPILER=$($script:Gxx)",
                   "-DDDS_DOMAIN_ID=$Domain",
                   "-DTELEMETRY_HZ=$Hz")
    if ($script:Ninja) { $configure += @('-G', 'Ninja') }
    if ($NoDds)        { $configure += '-DWITH_DDS=OFF' }
    if ($FastDds -and -not (Test-Path -LiteralPath $FastDds)) {
        Write-Fail "No Fast DDS install at: $FastDds" @(
            '-FastDds wants the install prefix, i.e. the folder holding include\ and lib\.',
            'Nothing is installed there, so there is nothing to point CMake at.',
            '',
            'To run the simulator without telemetry, just drop the flag:',
            "    .\run.ps1 -Domain $Domain"
        )
    }

    # Explicit flag wins; otherwise look in the usual places so the common case
    # needs no flag at all.
    $prefix = $FastDds
    if (-not $prefix -and -not $NoDds) {
        $prefix = Find-FastDds
        if ($prefix) { Write-Note "Fast DDS auto-detected: $prefix" }
    }
    if ($prefix) { $configure += "-DCMAKE_PREFIX_PATH=$prefix" }

    # stdout is captured so the chosen telemetry backend can be reported back.
    # Deliberately NOT "2>&1": in Windows PowerShell a redirected native stderr
    # becomes ErrorRecords, and CMake's "Fast DDS not found" warning would then
    # abort the script under $ErrorActionPreference = 'Stop'.
    # 'Continue' while CMake runs: if the caller pipes this script, its stderr
    # gets wrapped into ErrorRecords and CMake's own warnings would otherwise
    # abort us under 'Stop'.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & $script:CMake @configure
    $configureExit = $LASTEXITCODE
    $ErrorActionPreference = $previous

    $output | ForEach-Object { Write-Host $_ }
    if ($configureExit -ne 0) { throw "cmake configure failed with exit code $configureExit" }

    $script:Backend = 'unknown'
    $match = $output | Select-String -Pattern 'Telemetry backend:\s*(\S+)' | Select-Object -First 1
    if ($match) { $script:Backend = $match.Matches[0].Groups[1].Value }

    Write-Step 'Building'
    Invoke-Checked -Exe $script:CMake -Arguments @('--build', $BuildDir) -What 'cmake build'

    if ($script:Backend -eq 'dds') {
        Write-Host "    telemetry backend: dds" -ForegroundColor Green
    } else {
        Write-Host "    telemetry backend: $($script:Backend)" -ForegroundColor Yellow
        Write-Note 'The simulator will run standalone. Pass -FastDds <install prefix> to enable DDS.'
    }
}

function Invoke-Bindings {
    Initialize-Toolchain
    if (-not (Test-Path -LiteralPath $BuildDir)) {
        throw 'No build directory. Run "-Task build" first.'
    }

    # CMakeLists.txt only declares the python-bindings target when it found
    # fastddsgen at configure time; without this guard the user just gets
    # "ninja: error: unknown target".
    $generator = Resolve-Tool -Name 'fastddsgen' -Candidates @('fastddsgen.bat')
    if (-not $generator) {
        Write-Warning 'fastddsgen is not on PATH, so the python-bindings target does not exist.'
        Write-Note 'fastddsgen ships with Fast DDS and needs a JRE. Once it is on PATH:'
        Write-Note '  .\run.ps1 -Task build -FastDds <install prefix>'
        Write-Note '  .\run.ps1 -Task bindings'
        return
    }

    Write-Step 'Generating and building Fast DDS Python type support'
    Invoke-Checked -Exe $script:CMake `
                   -Arguments @('--build', $BuildDir, '--target', 'python-bindings') `
                   -What 'python-bindings'

    $paths = Get-BindingPaths
    if ($paths) {
        Write-Note 'Add these to PYTHONPATH (run.ps1 does it automatically):'
        $paths | ForEach-Object { Write-Note "  $_" }
    } else {
        Write-Warning 'Build reported success but no FlowTelemetry module was found.'
    }
}

function Start-Simulator {
    if (-not (Test-Path -LiteralPath $Exe)) {
        throw "Simulator not built: $Exe. Run `"-Task build`" first."
    }
    Write-Step 'Launching the simulator'
    $process = Start-Process -FilePath $Exe -WorkingDirectory $BuildDir -PassThru
    Write-Note "pid $($process.Id) - close its window or press ESC to stop it"
    return $process
}

function Start-Monitor {
    $python = Get-PythonExe
    Write-Step "Starting the matplotlib monitor on domain $Domain"
    Write-Note "python: $python"

    $bindings = Get-BindingPaths
    if ($bindings) {
        $env:PYTHONPATH = (($bindings + @($env:PYTHONPATH)) | Where-Object { $_ }) -join ';'
        Write-Note "PYTHONPATH += $($bindings -join '; ')"
    }

    # Probe for the bindings so we can explain the problem instead of dumping a
    # raw ImportError. 'Continue' while probing: the swallowed stderr would
    # otherwise surface as a terminating NativeCommandError.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $python -c 'import fastdds' 2>&1 | Out-Null
    $hasFastDds = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $previous

    # DDS needs both the bindings and the generated types; otherwise fall back
    # to the UDP transport, which the default build publishes anyway.
    $transport = 'udp'
    if ($hasFastDds -and $bindings) { $transport = 'dds' }
    Write-Note "transport: $transport"

    # Redraw a little faster than the publish rate so no sample waits a frame.
    $interval = [int][math]::Max(10, [math]::Floor(1000.0 / ($Hz * 1.5)))
    Write-Note "redraw interval: ${interval} ms (publish $Hz Hz)"

    & $python $MonitorPy '--domain' $Domain '--transport' $transport '--interval' $interval
}

#------------------------------------------------------------------------------
# Dispatch
#------------------------------------------------------------------------------
$script:Backend = 'unknown'

switch ($Task) {
    'clean'    { Invoke-Clean }
    'build'    { Invoke-Build }
    'bindings' { Invoke-Bindings }
    'sim'      { $null = Start-Simulator }
    'monitor'  { Start-Monitor }

    'all' {
        Invoke-Build
        $sim = Start-Simulator

        try {
            Start-Sleep -Seconds 1      # let discovery / the socket settle
            Start-Monitor
        }
        finally {
            if (-not $sim.HasExited) {
                Write-Step 'Monitor closed, stopping the simulator'
                Stop-Process -Id $sim.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Write-Host ''
