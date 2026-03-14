import joblib

# Save kiye hue files load karo
model = joblib.load('phish_model.pkl')
vectorizer = joblib.load('vectorizer.pkl')

def check_message(text):
    data = vectorizer.transform([text])
    prediction = model.predict(data)
    return "SPAM / PHISHING" if prediction[0] == 1 else "SAFE / HAM"

# Test karke dekho
msg = input("Koi message ya link yahan paste karo: ")
print(f"Result: {check_message(msg)}")