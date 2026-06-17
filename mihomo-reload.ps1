# mihomo-reload.ps1 — 通过 .NET NamedPipeClient 发送热重载
$pipe = New-Object System.IO.Pipes.NamedPipeClientStream(".", "verge-mihomo", [System.IO.Pipes.PipeDirection]::InOut)
try { $pipe.Connect(5000) } catch { Write-Output "ERR:connect_timeout"; exit 1 }

$writer = New-Object System.IO.StreamWriter($pipe)
$reader = New-Object System.IO.StreamReader($pipe)

$body = '{"path":""}'
$req = "PUT /configs?force=true HTTP/1.1`r`nHost: localhost`r`nContent-Type: application/json`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n$body"
$writer.Write($req); $writer.Flush()

$resp = ""
try { $resp = $reader.ReadToEnd() } catch {}
try { $writer.Close() } catch {}
try { $reader.Close() } catch {}
try { $pipe.Close() } catch {}

if ($resp -match '200|204') { Write-Output "OK" }
else {
    # 返回完整响应给调用方
    $resp -split "`n" | ForEach-Object { if ($_ -match '\S') { Write-Output $_ } }
}
