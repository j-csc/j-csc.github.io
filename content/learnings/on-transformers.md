---
title: On Transformers
description: Learning notes on transformers
date: 2025-11-11
sectionOrder: 3
---

## Transformers

In most cases, transformers take high dimensional arrays (tensors) as inputs, progressively transformed into outputs through layers of attention and feedforward networks. The tunable parameters are weights and biases in these layers, that get matmul'd with the input tensors to produce output tensors. Weights are what defines the model while the data encodes what's being processed.

Let's run through the architecture with a single sentence like "The cat sat on the mat".

## Tokenization

First we can breakdown the sentence into tokens. Tokens are usually words or subwords. For example, "The cat sat on the mat" can be tokenized into ["The", "cat", "sat", "on", "the", "mat"]. In practice, tokenization is done using byte pair encoding (BPE) or similar algorithms that break down words into subwords based on frequency in the training corpus and it looks something like ["Th", "e", " cat", " sat", " on", " the", " mat"].

The model has a predefined vocabulary of tokens that it can recognize, usually like 50,000 words. The embedding matrix $W_E$ is a learned parameter of shape (vocab_size, embedding_dim), it has a single column for each token in the vocabulary, and each column is a learned vector representation of that token.

Just like how you can slice a 2d plane and map the 3d world onto it, the embedding matrix maps discrete tokens into a high dimensional space. If you map it to a 3d space you can see directions in that space that correspond to semantic meaning, like "king - man + woman = queen", and $E(aunt) - E(uncle) = E(woman) - E(man)$. For example if you do $E(Sushi) - E(Japan) + E(Germany) = E(Brahtwurst)$, as in the embedding space seems to have captured  cultural relationships. In 12,288 dimensions, these relationships are even more nuanced.

> Dot product $[v_1, v_2, ...] \cdot [w_1, w_2, ...] = v_1w_1 + v_2w_2 + ...$ shows similarity between vectors. Dot product is 0 if orthogonal, positive if similar, negative if opposite. Cosine similarity is dot product normalized by vector lengths, to get a measure of similarity that is independent of vector magnitude.

In GPT-3 Embedding space has 12,288 dimensions. So the embedding matrix has shape (50,000 vocab/token size, 12,288 embed dim). So there's ~617 million weights in the embedding matrix alone. 

> $W_E = \begin{bmatrix} | & | & & | \\ E(token_1) & E(token_2) & ... & E(token_{50000}) \\ | & | & & | \end{bmatrix}$

Next the goal is to empower this embedding matrix to encode meaning / context, but the goal of attention / transformers is to help words soak up meaning from surrounding words.

The network can only process a fixed vector size at a time. This is **context window size**. It limits how much text the model can incorporate when predicting the next token. For GPT-3, the context window size is 2048 tokens. This means the model can only consider 2048 tokens when generating the next token.

The unembedding matrix $W_U$ is another learned parameter of shape (embedding_dim, vocab_size). It maps the final output vectors back to token probabilities. It is often the transpose of the embedding matrix, i.e. $W_U = {W_E}^T$. so we have (12,288 embed dim, 50,000 vocab size). This means there's another ~617 million weights in the unembedding matrix.

> $W_U = \begin{bmatrix} - & E(token_1)^T & - \\ - & E(token_2)^T & - \\ & ... & \\ - & E(token_{50000})^T & - \end{bmatrix}$

Lastly before we move on, softmax:
> Softmax converts raw scores (logits) into probabilities that add up to 1 (probability distribution). It exponentiates each score (positive values) and normalizes by the sum of exponentials. This ensures all probabilities are positive and sum to 1. $softmax(z_i) = \frac{e^{z_i}}{\sum_{j} e^{z_j}}$.

**Temperature** is a hyperparameter that in the softmax $softmax(z_i) = \frac{e^{z_i / T}}{\sum_{j} e^{z_j / T}}$. Higher temperature (>1) makes the distribution more uniform (more random sampling), while lower temperature (<1) makes it peakier (setting it to 0 means all the weight goes to that value, we always get the same token).

## Attention

For example a sentence "A fluffy blue cat." has 4 tokens. Each token is embedded into a 12,288 dimensional vector using the embedding matrix $W_E$. So we have 4 vectors of shape (12288,). We can stack them into a matrix of shape (4, 12,288) where each row corresponds to a token's embedding. Let's denote them as $E_1, E_2, E_3, E_4$.

> Here we have (sequence_length, embedding_dim) = (4, 12288)

Let's take the example "cat" at position 4, we want to ask the question "what adjectives are describing the noun cat?". We call that the Query vector $Q_4$. Usually this **query/key space** has 128 dimension. So we multiply the embedding $E_4$ with a learned weight matrix $W_Q$ of shape (embedding_dim, query_dim) = (12288, 128) to get the query vector: $$Q_4 = E_4 W_Q$$.

At the same time there is a key matrix $K$ that encodes what each word is about. So we multiply each embedding with a learned weight matrix $W_K$ of shape (embedding_dim, key_dim) = (12288, 128) to get the key vectors: $$K_i = E_i W_K $$ for i in [1,4].

We can think of the query vector $Q_4$ as a question "what adjectives are describing this noun?" and each key vector $K_i$ as a potential answer "I am an adjective!". 

Once we compute the dot product between the query and each key: $score_i = Q_4 \cdot K_i$, we get a score for how relevant each token is to the query. Higher scores mean more relevance.

So in this case the scores for "A", "fluffy", "blue", "cat" might be [-1, 92, 85, 20] respectively, indicating that "fluffy" and "blue" are highly relevant to describing "cat". **This means fluffy and blue "attend" to cat.**

Now to normalize the values, we apply softmax to the scores: $attention\_weights_i = softmax(score_i)$. This converts the scores into probabilities that sum to 1. So we might get attention weights like [0.0001, 0.6, 0.35, 0.0499].

To represent the dot product of $Q$ and $K$ in a compact form, we can use matrix multiplication. Let $Q$ be the matrix of query vectors and $K$ be the matrix of key vectors. Then the attention scores can be computed as:

$$
scores = Q K^T
$$

We then divide the scores by the square root of the key dimension (to stabilize gradients) and apply softmax:
$$
attention\_weights = softmax\left(\frac{scores}{\sqrt{d_k}}\right)
$$

> You are literally just measuring similarity between the query $Q = W_Q E$ and key $K = W_K E$ via taking a dot product between them, dividing by sqrt of dimension to stabilize gradients, and applying softmax to get a probability distribution.

Now on **masking**, before applying softmax, we set the scores for future tokens to negative infinity (-inf). This ensures that when we apply softmax, those future tokens get zero attention weight. This is crucial for autoregressive models like GPT, which should not attend to future tokens when predicting the next token.

> **Context Size** limits how many tokens the model can attend to. The size of the attention matrix is (context_size, context_size) which means $Q$ and $K$ are both of size (sequence_length, key_dim) where sequence_length ≤ context_size. For GPT-3, the context size is 2048 tokens, so the attention matrix is (2048, 2048). This means that the Q and K matrices are both of shape (2048, 128) if the key dimension is 128. The 2048 limit was determined through empirical testing and hardware constraints, not derived from the 12,288 embedding dimension. **Context size is simply a constraint that if the input sequence exceeds this length, the model will truncate or split the input sequence.**

Now onto the value matrix $V$

The value matrix $V$ is computed in a similar way to the key matrix. Each embedding $E_i$ is multiplied by a learned weight matrix $W_V$ of shape (embedding_dim, value_dim) = (12288, 128) to get the value vectors:
$V_i = E_i W_V$ for i in [1,4].

> Intuitively the value vector is what you get from multiplying the value matrix $W_V$ to the embedding of the word $E_i$. It encodes the actual information/content of the token. 

The value matrix is used to compute the final output of the attention layer. The output is a weighted sum of the value vectors, where the weights are the attention weights computed earlier:
$$
output = \sum_{i} attention\_weights_i V_i
$$

This output vector now contains information from the tokens that are most relevant to the query, weighted by their importance. In our example, the output vector for "cat" will be heavily influenced by the value vectors of "fluffy" and "blue", since they had high attention weights.

> In layman terms, the query asks "what adjectives describe cat?", the keys represent "I am an adjective!", and the values contain the actual content of those adjectives. The attention mechanism then combines the content of the most relevant adjectives to form a rich representation of "cat" in context.

Everything described is a self-attention mechanism, because the queries, keys, and values all come from the same set of embeddings. In practice, transformers use multi-head attention, where multiple sets of queries, keys, and values are computed in parallel. This allows the model to attend to different aspects of the input simultaneously.

For cross attention, the queries come from one source (e.g., decoder embeddings) while the keys and values come from another source (e.g., encoder embeddings). This allows the model to attend to relevant information from a different sequence when generating output.

The idea is all of these changes are linear transformations of the original embeddings, allowing the model to learn complex relationships between tokens based on their context.

> Here the main reason why transformers are heavily used over RNNs/LSTMs is because attention allows for direct connections between all tokens in the input sequence, regardless of their distance. This enables the model to capture long-range dependencies and relationships more effectively than RNNs/LSTMs, which process tokens sequentially and can struggle with long-term dependencies due to vanishing gradients.

## MLPs

After the sequence of vectors have gone through blocks of attention layers and MLP, the hope is by the end each token embedding vector has soaked up enough knowledge from the context, other words from the input and general knowledge baked into the weights from training, to make a good prediction of the next token.

> For the cat example, first layer encodes I need a noun next, then proceeded by something that's fluffy and blue, so the model predicts "cat" as the next token.

Majority of the parameters in transformers are in MLPs. The idea is they offer extra capacity to store facts.

The MLP (Multi-Layer Perceptron) in transformers typically has **two linear layers** with an expansion and contraction pattern:

1. **Expansion layer**: Projects from embedding dimension (12,288) to a larger hidden dimension (usually 4x = 49,152)
2. **Contraction layer**: Projects back down to embedding dimension (12,288)

For each token's vector `x`, the MLP operation is:

$$
MLP(x) = W_2 \cdot activation(W_1 x + b_1) + b_2
$$

Where:
- `W_1`: (12288, 49152) - expansion weight matrix  
- `W_2`: (49152, 12288) - contraction weight matrix
- `activation`: typically GELU or ReLU
- `b_1, b_2`: bias vectors

Each row in `W_1` can be thought of as a "feature detector" that might activate for patterns like "is animal?", "is past tense?", etc. The expansion allows the model to check for many different patterns simultaneously before combining them back into the embedding space.

> Each row in W_1 can be thought of as a "feature detector" that activates for certain patterns in the input vector x. For example, one row might detect if the token represents an animal, another might detect if it's in past tense, etc. The expansion to a larger hidden dimension allows the model to check for many different patterns simultaneously before combining them back into the embedding space. Each column in W_2 can be thought of as a "feature combiner" that takes the activated features from the hidden layer and combines them to produce the final output vector in the embedding space.

## Superposition

Last neat process is superposition, meaning neurons in MLP can store multiple features in the same weights by overlapping them in high dimensional space. This is possible because in high dimensions, random vectors are likely to be nearly orthogonal (Johnson-Lindenstrauss lemma where the number of vectors you can cram into a space nearly perpendicular (89-91) is exponential to the dimension), allowing multiple features to coexist without interference. This allows models to have more capacity than the number of neurons would suggest.

So why is perpendicularity important? Because if two features are perpendicular, activating one doesn't affect the other. This means the model can store many features in the same set of weights without them interfering with each other.