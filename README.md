
# Importing the necessary libraries
from flask import Flask, render_template, request
import pandas as pd
from flask import jsonify
import re
import os

# Initialize the Flask application
app = Flask(__name__, static_folder='static')

# Get the absolute path of the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Build the absolute paths to the CSV files
movies_path = os.path.join(current_dir, "data", "movies.csv")
ratings_path = os.path.join(current_dir, "data", "ratings.csv")

# load data
df_movies = pd.read_csv(movies_path)
df_ratings = pd.read_csv(ratings_path)

# Calculating the average rating of movies, to use later to filter the movies with an average rating greater than 2.8
average_ratings = df_ratings.groupby('movieId')['rating'].mean().reset_index()

# Filter movies with an average rating greater than 2.8
movies_filtered = df_movies.merge(average_ratings[average_ratings['rating'] > 2.8], on='movieId')
rating_filtered = df_ratings.merge(movies_filtered[['movieId']], on='movieId')

# filtered datasets, to avoid loading the entire dataset into memory
movies = movies_filtered
ratings = rating_filtered

# Data cleaning and processing
def clean_string(string):
    string = re.sub("[^a-zA-Z0-9 ]", "", string)
    return string

# Fill NaN values in the genres column with an empty string
movies['genres'] = movies['genres'].fillna('')

# Apply the clean_string function to the title column
movies['title'] = movies['title'].apply(clean_string)

# Function to find similar movies based on user ratings
def find_similar_movies(movie_id):
    # Find users who have rated the movie above 4   
    similar_users = ratings[(ratings["movieId"] == movie_id) & (ratings["rating"] > 4)]["userId"].unique()
    
    # Find movies that these users have rated above 4
    similar_user_recs = ratings[(ratings["userId"].isin(similar_users)) & (ratings["rating"] > 4)]["movieId"]
    
    # Calculate the percentage of users who have rated the movie above 4
    similar_user_recs = similar_user_recs.value_counts() / len(similar_users)
    
    # Filter the movies that have been rated by more than 10% of the similar users
    similar_user_recs = similar_user_recs[similar_user_recs > .10]
    
    # Find all users who have rated the movies above 4
    all_users = ratings[(ratings["movieId"].isin(similar_user_recs.index)) & (ratings["rating"] > 4)]
    
    # Calculate the percentage of users who have rated the movies above 4
    all_user_recs = all_users["movieId"].value_counts() / len(all_users["userId"].unique())
    
    # Concatenate the similar user recommendations with the all user recommendations
    rec_percentages = pd.concat([similar_user_recs, all_user_recs], axis=1) 
    
    # Rename the columns
    rec_percentages.columns = ["similar", "all"]
    
    # Calculate the score as the ratio of similar users to all users
    rec_percentages["score"] = round(rec_percentages["similar"] / rec_percentages["all"], 4)
    
    # Sort the results by score in descending order
    rec_percentages = rec_percentages.sort_values("score", ascending=False)
    
    # Merge the results with the movies dataset and return the top 10 results
    return rec_percentages.head(10).merge(movies, left_index=True, right_on="movieId")[["score", "title", "genres"]]

# Function to get recommendations
def get_recommendations(title):
    try:
        # Obtain the movieId corresponding to the title
        movie_id = movies[movies['title'] == title]['movieId'].iloc[0]
        
        # Use find_similar_movies function to get recommendations
        similar_movies = find_similar_movies(movie_id)
        
        # Return the titles and the recommendation percentages
        return similar_movies[['title', 'score']].to_dict('records')
    except IndexError:
        return None

# Flask routes

# Home route
@app.route('/', methods=['GET', 'POST'])
def home():
    if request.method == 'POST':
        movie_title = request.form['movie_title']
        recommendations = get_recommendations(movie_title)
        if recommendations is None:
            error = "Movie not found, please try again"
            return render_template('index.html', error=error)
        return render_template('index.html', recommendations=recommendations)
    return render_template('index.html')

# Autocomplete search
@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query', '')
    results = movies[movies['title'].str.contains(query, case=False, na=False)]['title'].tolist()
    return jsonify(results[:10])

# Run the app
if __name__ == '__main__':
    app.run(debug=True)

