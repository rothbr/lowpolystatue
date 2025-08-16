import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { fal } from "@fal-ai/client";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static("public"));

fal.config({
  credentials: "1f3b1c77-e5fa-43d4-9dd6-716949f51020:c33eb1b148371e5668c12905e871f004"
});



app.post("/gerar-prompt", async (req, res) => {
    console.log("=== Nova requisição /gerar-prompt ===");
    const { imageUrl } = req.body;

    if (!imageUrl) {
        console.log("URL da imagem não enviada!");
        return res.status(400).json({ error: "URL da imagem não enviada" });
    }

    console.log("URL da imagem recebida:", imageUrl);

    try {
        console.log("Enviando requisição para a OpenAI...");
        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4.1-mini",
                input: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "input_text",
                                text: "Crie um prompt tipo o exemplo que enviei, só que dessa foto que enviei, 'Monochrome geometric low-poly full-body 3D statue of an elderly couple from the reference photo, standing side by side. Chibi proportions with oversized heads, big friendly smiles. Woman: short light hair, wide-brimmed hat with decorative band, white dress with lace shawl, necklace, flat shoes. Man: short gray hair, black hat, glasses, jacket, checkered shirt with red tie, beige pants, brown sandals. Pose: standing close together, arms slightly touching, on a simple round pedestal base, facing forward. Style: extremely low polygon count (<1500 faces), large flat facets, sharp edges, no smooth shading, no textures or gradients. Statue must be in a single solid matte gray color only. Neutral studio background, soft lighting, high-quality render.'"
                            },
                            {
                                type: "input_image",
                                image_url: imageUrl
                            }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();
        console.log("Resposta da API:", JSON.stringify(data, null, 2));

        // Pegar o texto real da resposta
        const descricao = data.output?.[0]?.content?.find(c => c.type === "output_text")?.text
            || "Descrição não disponível.";

        const promptChibi = `${descricao} 3d lowpoly`;

        // Geração de imagem no Fal
        const result = await fal.subscribe("fal-ai/qwen-image", {
            input: { 
                prompt: promptChibi,
                loras: [
                    { path: "https://v3.fal.media/files/penguin/fmFPe-Yr8SLPj_7BYWcXi_jonny_qwen_lora_v8_1024.safetensors", weight: 1 },
                    { path: "https://v3.fal.media/files/rabbit/9HzQtEHe1rgUS4CAsVJMn_jonny_qwen_lora_v8_1024.safetensors", weight: 1 }
                ]   
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    update.logs.map((log) => log.message).forEach(console.log);
                }
            },
        });


        // URL da imagem gerada
        const imageUrlFal = result.data.images?.[0]?.url || null;
        console.log("Imagem gerada pelo Fal:", imageUrlFal);

        // Enviar para o front
        res.json({
            prompt: promptChibi,
            image: imageUrlFal
        });

    } catch (err) {
        console.error("Erro ao chamar a API da OpenAI:", err);
        res.status(500).json({ error: "Erro ao gerar prompt" });
    }
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
