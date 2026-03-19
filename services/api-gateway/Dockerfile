FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Mantemos a pasta 'services' para respeitar o caminho '../shared-contracts'
COPY ["services/api-gateway/ApiGateway.csproj", "services/api-gateway/"]
COPY ["services/shared-contracts/SharedContracts.csproj", "services/shared-contracts/"]

RUN dotnet restore "services/api-gateway/ApiGateway.csproj"

# Copiamos o código mantendo a estrutura original
COPY services/api-gateway/ services/api-gateway/
COPY services/shared-contracts/ services/shared-contracts/

WORKDIR "/src/services/api-gateway"
RUN dotnet publish "ApiGateway.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ApiGateway.dll"]