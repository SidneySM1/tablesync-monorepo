# Estágio de Build usando o SDK 10.0
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# 1. Copia os arquivos de projeto (Preserva o cache do restore)
COPY ["services/api-gateway/ApiGateway.csproj", "services/api-gateway/"]
COPY ["shared-contracts/SharedContracts.csproj", "shared-contracts/"]

# 2. Restaura as dependências (apontando para o projeto principal)
RUN dotnet restore "services/api-gateway/ApiGateway.csproj"

# 3. Copia o código fonte de ambos os diretórios
COPY services/api-gateway/ services/api-gateway/
COPY shared-contracts/ shared-contracts/

# 4. Compila e publica
WORKDIR "/src/services/api-gateway"
RUN dotnet publish "ApiGateway.csproj" -c Release -o /app/publish

# Estágio de Runtime com ASP.NET 10.0
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ApiGateway.dll"]