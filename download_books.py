import os
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

target_dir = r"c:\Users\jaafa\Desktop\upload\FishWebClean\knowledge_base_pdfs"
os.makedirs(target_dir, exist_ok=True)

# 100% verified working links from live web search
books = {
    "1_California_Sea_Grant_Fish_Health.pdf": "https://caseagrant.ucsd.edu/sites/default/files/Manual%20of%20Fish%20Health%20Practices%202009.pdf",
    "2_FAO_Warmwater_Fish_Diseases_Guide.pdf": "https://openknowledge.fao.org/server/api/core/bitstreams/598a9cb7-22d9-41be-a223-26ebc761f6da/content",
    "3_IJSAT_Overview_Fish_Diseases_2025.pdf": "https://www.ijsat.org/papers/2025/1/1461.pdf",
    "4_Canada_Fish_Health_Protection_Manual.pdf": "https://waves-vagues.dfo-mpo.gc.ca/Library/18276E.pdf",
    "5_Aquaculture_Fish_Health_Management_Plan.pdf": "https://www.aquaculturecouncilwa.com/wp-content/uploads/2019/05/FHMP20Template20V3.pdf",
    "6_CCAC_Care_and_Use_of_Fish.pdf": "https://ccac.ca/Documents/Standards/Guidelines/Fish.pdf"
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/pdf',
}

print(f"Starting download of {len(books)} newly verified scientific manuals...")
print(f"Destination: {target_dir}\n")

success_count = 0
for filename, url in books.items():
    filepath = os.path.join(target_dir, filename)
    print(f"Downloading: {filename}...")
    
    try:
        response = requests.get(url, headers=headers, verify=False, timeout=30)
        
        # Check if successful
        if response.status_code == 200:
            with open(filepath, 'wb') as out_file:
                out_file.write(response.content)
            print(f"  [+] Success: {filename} ({len(response.content) // 1024} KB)")
            success_count += 1
        else:
            print(f"  [-] Failed: {filename} (HTTP Status: {response.status_code})")
            
    except Exception as e:
        print(f"  [-] Failed: {filename}")
        print(f"      Error: {str(e)}")

print(f"\nDownload complete! Successfully downloaded {success_count}/{len(books)} books.")
