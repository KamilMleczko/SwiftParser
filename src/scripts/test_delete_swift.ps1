
$swiftCode = "TESTUS33000"  
$url = "http://localhost:8080/v1/swift-codes/$swiftCode"
$response = Invoke-RestMethod -Uri $url -Method Delete
Write-Output $response


