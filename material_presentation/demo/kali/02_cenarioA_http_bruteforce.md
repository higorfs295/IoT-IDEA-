# Kali — 02 · Cenário A: HTTP (interceptação + brute force)

> Alvo: painel web em `http://<IP_VM_ESP32>/` (ou `<IP_ESP32>` no físico), login `admin/admin123`, **sem TLS**.

## Ato 1 — Interceptação (Wireshark lê a senha em claro)

1. Abra o Wireshark e comece a capturar na interface da **rede interna**.
2. Aplique o filtro de exibição:
   ```
   http
   ```
3. No navegador da Kali (ou de outra máquina da rede), acesse `http://<IP_VM_ESP32>/`, mantenha `admin` / `admin123` e clique **Enviar dados**.
4. No Wireshark, ache o pacote `POST /login`. Clique com o botão direito → **Follow → HTTP Stream** (ou expanda *HTML Form URL Encoded*).
5. Mostre que aparecem em texto legível:
   ```
   usuario=admin
   senha=admin123
   ```

> **Fala:** "A comunicação é HTTP, sem criptografia. Qualquer um que observe a rede lê usuário e senha."

**Alternativa via terminal** (útil para telão, sem Wireshark):
```bash
# captura só o tráfego HTTP do alvo e mostra o corpo do POST
sudo tcpdump -i any -A -s0 "tcp port 80 and host <IP_VM_ESP32>" | grep -i "usuario="
```

## Ato 2 — Brute force do login (hydra)

O módulo `http-post-form` do hydra usa três campos separados por `:` —
`caminho : parâmetros_do_form : string_de_falha`.

- **caminho:** `/login`
- **parâmetros:** `usuario=^USER^&senha=^PASS^`
- **string de falha:** um texto que aparece **quando o login falha**. Nosso dispositivo responde `Senha incorreta` no corpo — use isso.

```bash
hydra -l admin -P ~/wordlist_demo.txt <IP_VM_ESP32> \
      http-post-form "/login:usuario=^USER^&senha=^PASS^:Senha incorreta"
```

Opções úteis:
- `-l admin` : usuário fixo `admin` (use `-L users.txt` para lista de usuários).
- `-P ~/wordlist_demo.txt` : lista de senhas (contém `admin123`).
- `-t 4` : tarefas paralelas (baixe para 1 se o alvo travar).
- `-V` : mostra cada tentativa (bom para o telão); `-f` : para no primeiro acerto.

**Resultado esperado:** o hydra reporta algo como
```
[80][http-post-form] host: <IP_VM_ESP32>   login: admin   password: admin123
```

> **Fala:** "Mesmo sem interceptar, a senha padrão cai no brute force em segundos. Por isso credencial padrão é uma das falhas mais exploradas (foi assim que a botnet Mirai cresceu)."

## Erros comuns (e ajustes)
- **hydra diz que TODAS as senhas funcionam** → a *string de falha* está errada. Confirme que uma senha errada realmente retorna `Senha incorreta` (`curl -s -X POST -d "usuario=admin&senha=x" http://<IP_VM_ESP32>/login`).
- **hydra não acha nada** → verifique o caminho (`/login`), os nomes dos campos (`usuario`, `senha`) e se `admin123` está na wordlist.
- **porta diferente de 80** → acrescente `-s <porta>` (ex.: `-s 8080`) e ajuste a URL.
- **HTTPS (após a virada)** → o módulo passa a ser `https-post-form` (a captura em claro deixa de funcionar; a senha forte impede o brute force).
- **HTTP 429 durante o hydra (após a virada com `--max-fails`)** → é o **rate limiting** agindo: o alvo bloqueou o IP por alguns segundos. Isso é o resultado esperado da defesa — mostre o placar de **bloqueios** subindo no painel.

## Plano B (sem rede ao vivo)
Tenha prints: (1) do Wireshark mostrando `senha=admin123`; (2) do hydra reportando a senha encontrada. Narre por eles se a rede falhar.
