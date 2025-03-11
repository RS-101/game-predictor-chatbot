import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import kagglehub
import csv


# path = kagglehub.dataset_download("nathanlauga/nba-games")
# print("Path to dataset files:", path)
path_game_data = '/home/rasmus-emil/.cache/kagglehub/datasets/nathanlauga/nba-games/versions/10/games.csv'
path_players_data = '/home/rasmus-emil/.cache/kagglehub/datasets/nathanlauga/nba-games/versions/10/players.csv'
cnt=0
with open(path_game_data, 'r') as file:
    csvreader = csv.reader(file)
    header = next(csvreader)
    # print("Header:", header)
    print('game_data header is',np.array([ header[5], header[3], header[4], header[7], header[8], header[9], header[10],header[11],header[12],header[14],header[15],header[16],header[17],header[18],header[19],header[20] ]))
    game_data = np.zeros((1,16))

    for row in csvreader:
      if row[5] != '2003' : # 2003 data is not detailed
        cnt = cnt+1
        if row[7] == '':
          print(cnt)
          print(row)
          break
        entry = np.array([[ float(row[5]), float(row[3]), float(row[4]), float(row[7]), float(row[8]), float(row[9]), float(row[10]),float(row[11]),float(row[12]),float(row[14]),float(row[15]),float(row[16]),float(row[17]),float(row[18]),float(row[19]),float(row[20]) ]])
        game_data = np.concatenate((game_data,entry),axis = 0)

        if cnt == 2000:
          break
        if cnt%5000 == 0:
          print(100*cnt/25267,'% done')


print(cnt,'game data stored')
game_data = game_data[1:,:]
print(np.shape(game_data))
