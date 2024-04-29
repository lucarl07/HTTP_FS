import http from "http";
import fs from "fs";

const PORT = 4444;

const server = http.createServer((req, res) => {
  const { url, method } = req;

  fs.readFile("empregados.json", "utf8", (err, data) => {
    // EM CASO DE ERRO NO SERVIDOR:
    if (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Erro interno do servidor" }));
      return;
    }

    // VALIDAÇÃO DE DADOS:
    let jsonData = [];
    try {
      jsonData = JSON.parse(data);
    } catch (error) {
      console.error("Erro ao analisar JSON:", error);
    }

    // ENDPOINTS:
    if (url === "/empregados" && method === "GET") { // Lista todos os funcionários.
      
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(jsonData));

    } else if (url === "/empregados/count" && method === "GET") { // Obtêm o total de funcionários cadastrados.
      
      const nOfEmployees = jsonData.length;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ "Número de funcionários": nOfEmployees }));

    } else if (url.startsWith("/empregados/porCargo/") && method === "GET") { // Listar os funcionários por cargo detido.
      
      const office = url.split("/")[3].toLowerCase();
      const employees = jsonData.filter(emp => emp.cargo.toLowerCase() === office);
      
      if (employees.length > 0) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(employees));
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Cargo inexistente na base de dados." }));
      }

    } else if (url.startsWith("/empregados/porHabilidade/") && method === "GET") { // Listar os funcionários por habilidade detida.
      
      const skill = url.split("/")[3].toLowerCase();
      console.log(skill);

      const employees = jsonData.filter(emp => {
        const hasSkill = emp.habilidades.find(empSk => empSk.toLowerCase() === skill)
        if (hasSkill) { 
          return emp
        }
      });

      if (employees.length > 0) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(employees));
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Habilidade inexistente na base de dados." }));
      }

    } else if (url.startsWith("/empregados/porFaixaSalarial?") && method === "GET") { // Listar funcionários por faixa salarial (A FINALIZAR)
      
      const attributes = url.split("?")[1]
      console.log(attributes);
      
      res.writeHead(204, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ 
        output: "Não há nada a ser pesquisado no momento.",
        message: "O endpoint ainda está sendo construído."
      }));

    } else if (url === "/empregados" && method === "POST") { // Adiciona um funcionário novo.
      
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        const employee = JSON.parse(body);

        // Caso o usuário tenha menos de 18:
        if (employee.idade < 18) {
          res.writeHead(403, {"Content-Type": "application/json"})
          res.end(JSON.stringify({
            output: "Seu cadastro foi recusado.",
            message: "Somente aceitamos funcionários a partir dos 18 anos."
          }))
          return;
        }

        // Caso as senhas sejam vazias ou incompatíveis:
        if (employee.senha === '' || employee.confirmarSenha === '') {
          res.writeHead(401, {"Content-Type": "application/json"})
          res.end(JSON.stringify({
            output: "Seu cadastro foi recusado.",
            message: "Insira uma senha e a repita para confirmação."
          }))
          return;
        } else if (employee.senha !== employee.confirmarSenha) {
          res.writeHead(401, {"Content-Type": "application/json"})
          res.end(JSON.stringify({
            output: "Seu cadastro foi recusado.",
            message: "As senhas fornecidas NÃO são iguais. Por favor, revise-as."
          }))
          return;
        }

        // Adicionar o empregado à array de dados:
        delete employee.confirmarSenha;
        employee.id = jsonData.length + 1;
        jsonData.push(employee);
        
        fs.writeFile("empregados.json",
          JSON.stringify(jsonData, null, 2),
          (err) => {
            if (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ message: "Erro interno do servidor." }));
              return;
            }
            
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify(employee));
          }
        );
      });
      
    } else if (url.startsWith("/empregados/") && method === "PUT") { // Procura um funcionário pelo ID e atualizar suas informações.
      
      const id = parseInt(url.split("/")[2]); 
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        const updtEmployee = JSON.parse(body);
        const index = jsonData.findIndex((item) => item.id === id);

        if (updtEmployee.hasOwnProperty("confirmarSenha") && index !== -1) {
          
          if (updtEmployee.confirmarSenha === jsonData[index].senha) {
            jsonData[index] = { ...jsonData[index], ...updtEmployee }
            delete jsonData[index].confirmarSenha;
          } else {
            res.writeHead(401, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ 
              output: "Alteração não autorizada.",
              message: "Por favor, digite sua senha inicial para confirmar as alterações."
            }))
          }
          
          fs.writeFile("empregados.json",
            JSON.stringify(jsonData, null, 2),
            (err) => {
              if (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({ message: "Erro interno do servidor" })
                );
                return;
              }

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(jsonData[index]));
            }
          );

        } else { // Caso o funcionário não seja encontrado:
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Funcionário não encontrado ou senha não inserida." }));
        }
      });
    } else if (url.startsWith("/empregados/") && method === "DELETE") { // Remove um funcionário pelo ID.
      
      const id = parseInt(url.split("/")[2]); 
      const index = jsonData.findIndex((item) => item.id === id);

      if (index !== -1) {
        jsonData.splice(index, 1);

        fs.writeFile("empregados.json",
          JSON.stringify(jsonData, null, 2),
          (err) => {
            if (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ message: "Erro interno do servidor." }));
              return;
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ message: "Empregado removido com sucesso." })
            );
          }
        );
      } else { // Caso o funcionário não seja encontrado:
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Livro não encontrado" }));
      }
    } else if (url.startsWith("/empregados/") && method === "GET") { // Lista um funcionário com base em seu ID.
      
      const id = parseInt(url.split("/")[2]);
      const index = jsonData.findIndex((item) => item.id === id);

      if (index !== -1) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(jsonData[index]));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Funcionário não encontrado." }));
      }

    } else { // Caso o endpoint não seja encontrado:
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Rota não encontrada" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor no PORT: ${PORT} 🚀`);
});
