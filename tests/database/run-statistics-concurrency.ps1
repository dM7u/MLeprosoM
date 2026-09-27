param([string]$PgBin = '.tools/db-validation/pgsql17/pgsql/bin')
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Set-Location -LiteralPath $repo
$bin = (Resolve-Path -LiteralPath $PgBin).Path
$run = Join-Path $repo ('.tools/db-validation/concurrency-' + [guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($run) | Out-Null
$cluster = Join-Path $run 'data'
$passwordPath = Join-Path $run 'password.txt'
$configPath = Join-Path $run 'connection.json'
$password = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
[IO.File]::WriteAllText($passwordPath, $password, [Text.UTF8Encoding]::new($false))
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$started = $false
try {
 & (Join-Path $bin 'initdb.exe') -D $cluster -U mle_local_test --auth=scram-sha-256 --encoding=UTF8 --locale=C --pwfile=$passwordPath | Out-Null
 if ($LASTEXITCODE -ne 0) { throw 'Local initdb failed' }
 Remove-Item -LiteralPath $passwordPath
 # Only this local disposable user/database can authenticate over IPv4 loopback.
 [IO.File]::WriteAllText((Join-Path $cluster 'pg_hba.conf'), "host all mle_local_test 127.0.0.1/32 scram-sha-256`n", [Text.UTF8Encoding]::new($false))
 $config = @{host='127.0.0.1';port=$port;user='mle_local_test';password=$password;database='postgres';cluster=$cluster}
 [IO.File]::WriteAllText($configPath, ($config | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
 $pgArgs = @('-D', ('"' + $cluster + '"'), '-l', ('"' + (Join-Path $run 'postgres.log') + '"'), '-o', ('"-h 127.0.0.1 -p ' + $port + '"'), '-w', '-t', '15', 'start')
 # Start-Process -Wait also waits for postgres descendants, which stay alive.
 $process = Start-Process -FilePath (Join-Path $bin 'pg_ctl.exe') -ArgumentList $pgArgs -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $run 'start.log') -RedirectStandardError (Join-Path $run 'start-error.log')
 if (-not $process.WaitForExit(20000)) { throw 'Local pg_ctl timed out' }
 if ($process.ExitCode -ne 0) { throw 'Local PostgreSQL start failed; inspect ignored run logs' }
 $started = $true
 & node --conditions=react-server tests/database/statistics-concurrency.mjs $configPath
 if ($LASTEXITCODE -ne 0) { throw 'Local concurrency test failed' }
} finally {
 $stopFailed = $false
 if ($started -or (Test-Path -LiteralPath (Join-Path $cluster 'postmaster.pid'))) {
  & (Join-Path $bin 'pg_ctl.exe') -D $cluster -m fast -w -t 15 stop | Out-Null
  $stopFailed = $LASTEXITCODE -ne 0
 }
 foreach ($file in @($passwordPath,$configPath)) { if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file } }
 if ($stopFailed) { throw 'Local PostgreSQL stop failed; inspect ignored run logs' }
}
