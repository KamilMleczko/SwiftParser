$uri = "http://localhost:8080/v1/swift-codes"
$headers = @{"Content-Type"="application/json"}
$body = @{
    address = "123 Main St"
    bankName = "Test Bank"
    countryISO2 = "US"
    countryName = "United States"
    isHeadquarter = $false
    swiftCode = "BCOSCLR1L3"
} | ConvertTo-Json -Depth 10
Write-Output "Response from server:"
$response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body


Write-Output $response