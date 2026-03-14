import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib

# 1. Data Load Karo
df = pd.read_csv('spam.csv', encoding='latin-1')

# Tere data ke hisaab se: v1 = Message, v2 = Label
df = df[['v1', 'v2']] 
df.columns = ['message', 'label']

# 2. Hardcore Cleaning (Sabse Important Step)
# Pehle un rows ko uda do jisme kuch bhi khali (NaN) ho
df = df.dropna()

# Label column mein jo extra spaces hote hain unhe saaf karo
df['label'] = df['label'].str.strip().str.lower()

# Map karo (Sirf ham aur spam ko)
df['label_num'] = df['label'].map({'ham': 0, 'spam': 1})

# Agar mapping ke baad bhi koi NaN bach gaya (unidentified labels), use uda do
df = df.dropna(subset=['label_num'])

# Ab check karte hain final count
print(f"Total rows after final cleaning: {len(df)}")
print(f"Unique labels found: {df['label_num'].unique()}")

# 3. Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(df['message'], df['label_num'], test_size=0.2, random_state=42)

# 4. Vectorization
vectorizer = TfidfVectorizer()
X_train_count = vectorizer.fit_transform(X_train)

# 5. Model Training (Ab Error nahi aayega)
model = MultinomialNB()
model.fit(X_train_count, y_train)

# 6. Accuracy Check
accuracy = model.score(vectorizer.transform(X_test), y_test)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

# 7. Save Models
joblib.dump(model, 'phish_model.pkl')
joblib.dump(vectorizer, 'vectorizer.pkl')
print("--- Success! phish_model.pkl and vectorizer.pkl are ready! ---")