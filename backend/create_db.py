import os
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

print("ডেটা লোড করা হচ্ছে... একটু অপেক্ষা করো...")

# ১. ফোল্ডার থেকে একসাথে সব পিডিএফ লোড করা (Magic of DirectoryLoader!)
pdf_folder_path = "./medical_books" # তোমার প্রজেক্টের ভেতরের ফোল্ডারের নাম
print(f"'{pdf_folder_path}' ফোল্ডার থেকে সব পিডিএফ চেক করা হচ্ছে...")

# PyPDFDirectoryLoader ব্যবহার করে ফোল্ডারের সব পিডিএফ পড়া
pdf_loader = PyPDFDirectoryLoader(pdf_folder_path)
all_documents = pdf_loader.load()

print(f"✅ ফোল্ডার থেকে সব পিডিএফ লোড হয়েছে! মোট পেজ: {len(all_documents)}")

# ২. টেক্সটকে ছোট অংশে ভাগ করা (Text Chunking)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150
)
chunks = text_splitter.split_documents(all_documents)
print(f"সব মিলিয়ে মোট {len(chunks)} টি খণ্ড তৈরি হয়েছে!")

# ৩. এমবেডিং ও ভেক্টর স্টোর (Vector Store) তৈরি
print("ডেটাবেস আপডেট হচ্ছে...")
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)

persist_directory = "./chroma_db"
vector_db = Chroma.from_documents(
    documents=chunks,
    embedding=embedding_model,
    persist_directory=persist_directory
)

print("🎉 দারুণ! ফোল্ডারের সব পিডিএফ সফলভাবে ডেটাবেসে যুক্ত হয়েছে!")
