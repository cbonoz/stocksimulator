import numpy as np
import pandas as pd

df = pd.read_csv('./full_company_list.csv')
print(df.columns.values)

stock_map = {}

for index, row in df.iterrows():
    stock_map[row['Symbol']] = row['Name']

with open('./map.txt', 'w') as f:
    f.write(str(stock_map))