const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(bodyParser.json());

const modpacksDirectory = path.join(__dirname, 'modpacks');
if (!fs.existsSync(modpacksDirectory)) {
    fs.mkdirSync(modpacksDirectory);
}

const tempfiles = path.join(__dirname, 'tempfiles');

// Configurar o Multer para lidar com uploads de arquivos
const upload = multer({ dest: tempfiles });

// Rota para criar um diretório para uma nova modpack
app.post('/createModpackDirectory/:uuid/:token', (req, res) => {
    const { uuid, token } = req.params;
    const modpackPath = path.join(modpacksDirectory, uuid);
    const modpackInfoFilePath = path.join(modpackPath, 'modpack.json');

    // Verificar se a pasta já existe
    if (fs.existsSync(modpackPath)) {
        return res.status(400).json({ error: 'Modpack directory already exists' });
    }
    fs.mkdirSync(modpackPath);
    fs.mkdirSync(path.join(modpackPath, 'mods_enabled'));
    fs.mkdirSync(path.join(modpackPath, 'mods_disabled'));
    try {
        const modpackInfo = {
            name: "",
            image: "",
            token: token,
            uuid: uuid,
            hash: "",
            version: "0.0.0"
        };

        // Crie o arquivo modpack.json
        fs.writeFileSync(modpackInfoFilePath, JSON.stringify(modpackInfo, null, 2));

        return res.status(200).json({ message: 'Modpack directory created successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred', error });
    }
});

// Rota para enviar um arquivo para a pasta da modpack
app.post('/uploadFile/:uuid/:path*', upload.single('file'), (req, res) => {
	const { uuid } = req.params;
	const filePath = req.params.path || ''; // Se não houver path especificado, usar string vazia
	const token    = req.headers.token || '';
	
	const modpackPath = path.join(modpacksDirectory, uuid);
	const modpackInfoFilePath = path.join(modpackPath, 'modpack.json');
	const modpackFilePath = path.join(modpacksDirectory, uuid, filePath);
	
	// Verificar se o token está correto (implemente sua lógica de autenticação aqui)
	const modpackInfo = JSON.parse(fs.readFileSync(modpackInfoFilePath, 'utf-8'));
	if (!isValidToken(token, modpackInfo)) {
		return res.status(403).json({ error: 'Invalid token' });
	}

	// Verificar se o UUID é válido ou se o diretório existe
	
	if (!isValidUUID(uuid) || !fs.existsSync(modpackPath)) {
		return res.status(404).json({ error: 'Modpack not found' });
	}

	const uploadedFile = req.file;
	if (!uploadedFile) {
		return res.status(400).json({ error: 'No file provided' });
	}

	try {
		const targetPath = path.join(modpackFilePath);
		fs.renameSync(uploadedFile.path, targetPath);
		return res.status(200).json({ message: 'File uploaded successfully' });
	} catch (error) {
		fs.unlinkSync(uploadedFile.path);
		return res.status(500).json({ error: 'An error occurred',  error});
	}
});

// Rota para buscar informações sobre uma modpack com base no UUID
app.get('/getModpackInfo/:uuid', (req, res) => {
	const { uuid } = req.params;
	const modpackPath = path.join(modpacksDirectory, uuid);
	const modpackInfoFilePath = path.join(modpackPath, 'modpack.json');
	
	// Verificar se o UUID é válido ou se o diretório existe
	if (!isValidUUID(uuid) || !fs.existsSync(modpackInfoFilePath)) {
		return res.status(404).json({ error: 'Modpack not found' });
	}

	try {
		const modpackInfo = JSON.parse(fs.readFileSync(modpackInfoFilePath, 'utf-8'));

		// Ajustar o campo "token" para uma string vazia
		modpackInfo.token = "";

		return res.status(200).json(modpackInfo);
	} catch (error) {
		return res.status(500).json({ error: 'An error occurred' });
	}
});


// Rota para acessar qualquer arquivo dentro da pasta da modpack por meio do UUID
app.get('/getModpackFile/:uuid/*', (req, res) => {
	const { uuid } = req.params;
	const modpackPath = path.join(modpacksDirectory, uuid);
	const requestedFilePath = path.join(modpackPath, req.params[0]);

	// Verificar se o UUID é válido e se o diretório existe
	if (!isValidUUID(uuid) || !fs.existsSync(requestedFilePath)) {
		return res.status(404).json({ error: 'File not found' });
	}

	try {
		const fileContent = fs.readFileSync(requestedFilePath);
		return res.status(200).send(fileContent);
	} catch (error) {
		return res.status(500).json({ error: 'An error occurred' });
	}
});

// Função para verificar se o token é válido
function isValidToken(token, modpackInfo) {
	// Comparar o token fornecido com o token no arquivo JSON
	return token === modpackInfo.token;
}

// Função para verificar se o UUID é válido
function isValidUUID(uuid) {
	// Implemente sua lógica para verificar se o UUID é válido
	// Pode ser uma validação simples ou consultar um banco de dados, por exemplo
	return true; // Retorne true se o UUID for válido
}

app.listen(3000, () => {
	console.log('Server is running on port 3000');
});